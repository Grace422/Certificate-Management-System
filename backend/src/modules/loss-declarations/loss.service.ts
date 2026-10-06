import { query, withTransaction } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { Role } from "../../middlewares/auth.middleware";
import { LossDeclarationRow } from "./loss.types";
import * as notifications from "../notifications/notifications.service";

export async function create(citizenId: string, input: { description: string; civilRecordId?: string }): Promise<LossDeclarationRow> {
  const result = await query<LossDeclarationRow>(
    `INSERT INTO loss_declarations (citizen_id, civil_record_id, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [citizenId, input.civilRecordId ?? null, input.description]
  );
  await query(
    "INSERT INTO audit_logs (actor_id, action, entity, entity_id) VALUES ($1, 'LOSS_DECLARATION_FILED', 'loss_declarations', $2)",
    [citizenId, result.rows[0].id]
  );
  return result.rows[0];
}

/**
 * Role-aware listing, same pattern as requests.list(): a citizen sees only
 * their own declarations; super_admin (the only role that reviews
 * declarations - see module README note) sees the full pending queue plus
 * recently-reviewed ones, joined with the citizen's name/email for display.
 */
export async function list(requester: { id: string; role: Role }): Promise<LossDeclarationRow[]> {
  if (requester.role === "citizen") {
    const result = await query<LossDeclarationRow>(
      "SELECT * FROM loss_declarations WHERE citizen_id = $1 ORDER BY declared_at DESC",
      [requester.id]
    );
    return result.rows;
  }

  if (requester.role === "super_admin") {
    const result = await query<LossDeclarationRow>(
      `SELECT ld.*, u.first_name || ' ' || u.last_name AS citizen_name, u.email AS citizen_email
       FROM loss_declarations ld
       JOIN users u ON u.id = ld.citizen_id
       ORDER BY (ld.status = 'pending') DESC, ld.declared_at DESC
       LIMIT 200`
    );
    return result.rows;
  }

  throw ApiError.forbidden("Your role cannot view loss declarations");
}

export async function getById(id: string, requester: { id: string; role: Role }): Promise<LossDeclarationRow> {
  const result = await query<LossDeclarationRow>("SELECT * FROM loss_declarations WHERE id = $1", [id]);
  if (result.rowCount === 0) throw ApiError.notFound("Declaration not found");
  const row = result.rows[0];
  if (requester.role === "citizen" && row.citizen_id !== requester.id) {
    throw ApiError.forbidden("You do not have access to this declaration");
  }
  return row;
}

/**
 * Verifies a loss declaration - signals to the citizen that the registry
 * has accepted their account of the loss and they may now request a
 * reissue via the normal request-certificate flow (search their record,
 * submit a request with requestType 'reissue').
 */
export async function verify(id: string, adminId: string, notes?: string): Promise<LossDeclarationRow> {
  return withTransaction(async (client) => {
    const existing = await client.query<LossDeclarationRow>("SELECT * FROM loss_declarations WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rowCount === 0) throw ApiError.notFound("Declaration not found");
    if (existing.rows[0].status !== "pending") throw ApiError.conflict(`Declaration is already ${existing.rows[0].status}`);

    const updated = await client.query<LossDeclarationRow>(
      "UPDATE loss_declarations SET status = 'verified', reviewed_at = now(), review_notes = $1 WHERE id = $2 RETURNING *",
      [notes ?? null, id]
    );
    await client.query(
      "INSERT INTO audit_logs (actor_id, action, entity, entity_id) VALUES ($1, 'LOSS_DECLARATION_VERIFIED', 'loss_declarations', $2)",
      [adminId, id]
    );

    const row = updated.rows[0];
    await notifications.create({
      userId: row.citizen_id,
      title: "Loss declaration verified",
      message: "Your lost-certificate declaration has been verified. You can now request a reissue from \"Request a certificate\".",
      entity: "loss_declarations",
      entityId: id
    }, client);

    return row;
  });
}

export async function reject(id: string, adminId: string, notes: string): Promise<LossDeclarationRow> {
  return withTransaction(async (client) => {
    const existing = await client.query<LossDeclarationRow>("SELECT * FROM loss_declarations WHERE id = $1 FOR UPDATE", [id]);
    if (existing.rowCount === 0) throw ApiError.notFound("Declaration not found");
    if (existing.rows[0].status !== "pending") throw ApiError.conflict(`Declaration is already ${existing.rows[0].status}`);

    const updated = await client.query<LossDeclarationRow>(
      "UPDATE loss_declarations SET status = 'rejected', reviewed_at = now(), review_notes = $1 WHERE id = $2 RETURNING *",
      [notes, id]
    );
    await client.query(
      "INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata) VALUES ($1, 'LOSS_DECLARATION_REJECTED', 'loss_declarations', $2, $3)",
      [adminId, id, JSON.stringify({ notes })]
    );

    const row = updated.rows[0];
    await notifications.create({
      userId: row.citizen_id,
      title: "Loss declaration rejected",
      message: `Your lost-certificate declaration was rejected. Reason: ${notes}`,
      entity: "loss_declarations",
      entityId: id
    }, client);

    return row;
  });
}
