import { query } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { LossDeclarationRow } from "./loss.types";

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

export async function listMine(citizenId: string): Promise<LossDeclarationRow[]> {
  const result = await query<LossDeclarationRow>(
    "SELECT * FROM loss_declarations WHERE citizen_id = $1 ORDER BY declared_at DESC",
    [citizenId]
  );
  return result.rows;
}

export async function getById(id: string, citizenId: string): Promise<LossDeclarationRow> {
  const result = await query<LossDeclarationRow>("SELECT * FROM loss_declarations WHERE id = $1", [id]);
  if (result.rowCount === 0) throw ApiError.notFound("Declaration not found");
  if (result.rows[0].citizen_id !== citizenId) throw ApiError.forbidden("You do not have access to this declaration");
  return result.rows[0];
}
