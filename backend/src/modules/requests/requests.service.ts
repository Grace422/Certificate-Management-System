import { query, withTransaction } from "../../config/db";
import { ApiError } from "../../utils/ApiError";
import { RequestRow } from "./requests.types";
import { Role } from "../../middlewares/auth.middleware";

const JOIN_SELECT = `
  r.*,
  cr.full_name AS record_full_name,
  oc.name AS origin_council_name,
  dc.name AS destination_council_name
`;
const JOIN_CLAUSE = `
  FROM certificate_requests r
  JOIN civil_records cr ON cr.id = r.civil_record_id
  JOIN councils oc ON oc.id = r.origin_council_id
  LEFT JOIN councils dc ON dc.id = r.destination_council_id
`;

interface RequesterContext {
  id: string;
  role: Role;
}

async function getManagedCouncilId(userId: string): Promise<string> {
  const res = await query<{ home_council_id: string | null }>("SELECT home_council_id FROM users WHERE id = $1", [userId]);
  const councilId = res.rows[0]?.home_council_id;
  if (!councilId) throw ApiError.forbidden("Your account is not assigned to manage a council");
  return councilId;
}

async function insertAudit(actorId: string, action: string, entityId: string, metadata: Record<string, unknown> = {}): Promise<void> {
  await query(
    "INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata) VALUES ($1, $2, 'certificate_requests', $3, $4)",
    [actorId, action, entityId, JSON.stringify(metadata)]
  );
}

/**
 * Creates a new certificate request. The origin council is derived from the
 * civil record being requested (where it was originally registered) -
 * the citizen never has to know or select this themselves.
 */
export async function create(citizenId: string, input: { civilRecordId: string; requestType: "copy" | "reissue"; latitude: number; longitude: number }): Promise<RequestRow> {
  const recordRes = await query<{ registered_council_id: string }>(
    "SELECT registered_council_id FROM civil_records WHERE id = $1",
    [input.civilRecordId]
  );
  if (recordRes.rowCount === 0) throw ApiError.notFound("Civil record not found");
  const originCouncilId = recordRes.rows[0].registered_council_id;

  const point = `POINT(${input.longitude} ${input.latitude})`;

  return withTransaction(async (client) => {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO certificate_requests (citizen_id, civil_record_id, request_type, origin_council_id, citizen_location)
       VALUES ($1, $2, $3, $4, ST_GeogFromText($5))
       RETURNING id`,
      [citizenId, input.civilRecordId, input.requestType, originCouncilId, point]
    );
    const id = inserted.rows[0].id;
    await client.query(
      "INSERT INTO audit_logs (actor_id, action, entity, entity_id) VALUES ($1, 'REQUEST_CREATED', 'certificate_requests', $2)",
      [citizenId, id]
    );

    const result = await client.query<RequestRow>(`SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.id = $1`, [id]);
    return result.rows[0];
  });
}

/**
 * Role-aware listing behind a single GET /requests endpoint:
 *   - citizen            -> their own requests
 *   - origin_admin       -> pending requests awaiting their council's approval
 *   - destination_admin  -> requests routed to their council (in transit / ready)
 *   - super_admin        -> everything (capped), for oversight
 */
export async function list(requester: RequesterContext): Promise<RequestRow[]> {
  switch (requester.role) {
    case "citizen": {
      const res = await query<RequestRow>(
        `SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.citizen_id = $1 ORDER BY r.requested_at DESC`,
        [requester.id]
      );
      return res.rows;
    }
    case "origin_admin": {
      const councilId = await getManagedCouncilId(requester.id);
      const res = await query<RequestRow>(
        `SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.origin_council_id = $1 AND r.status = 'pending' ORDER BY r.requested_at ASC`,
        [councilId]
      );
      return res.rows;
    }
    case "destination_admin": {
      const councilId = await getManagedCouncilId(requester.id);
      const res = await query<RequestRow>(
        `SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.destination_council_id = $1 AND r.status IN ('in_transit', 'ready_for_pickup') ORDER BY r.processed_at ASC`,
        [councilId]
      );
      return res.rows;
    }
    case "super_admin": {
      const res = await query<RequestRow>(`SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} ORDER BY r.requested_at DESC LIMIT 200`);
      return res.rows;
    }
    default:
      throw ApiError.forbidden("Your role cannot list requests");
  }
}

export async function getById(id: string, requester: RequesterContext): Promise<RequestRow> {
  const res = await query<RequestRow>(`SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.id = $1`, [id]);
  if (res.rowCount === 0) throw ApiError.notFound("Request not found");
  const row = res.rows[0];

  if (requester.role === "citizen" && row.citizen_id !== requester.id) {
    throw ApiError.forbidden("You do not have access to this request");
  }
  if (requester.role === "origin_admin") {
    const councilId = await getManagedCouncilId(requester.id);
    if (row.origin_council_id !== councilId) throw ApiError.forbidden("You do not have access to this request");
  }
  if (requester.role === "destination_admin") {
    const councilId = await getManagedCouncilId(requester.id);
    if (row.destination_council_id !== councilId) throw ApiError.forbidden("You do not have access to this request");
  }
  // super_admin: no restriction

  return row;
}

/**
 * Origin council approves the request. This single action both approves
 * AND routes: it computes the council nearest the citizen's captured
 * location (the whole point of the system - FR9) and moves the request
 * straight to 'in_transit', skipping a separate idle 'approved' state
 * since there is no manual routing step for staff to perform.
 */
export async function approve(requestId: string, adminUserId: string): Promise<RequestRow> {
  const councilId = await getManagedCouncilId(adminUserId);

  return withTransaction(async (client) => {
    const existing = await client.query<RequestRow>("SELECT * FROM certificate_requests WHERE id = $1 FOR UPDATE", [requestId]);
    if (existing.rowCount === 0) throw ApiError.notFound("Request not found");
    const request = existing.rows[0];

    if (request.origin_council_id !== councilId) throw ApiError.forbidden("This request does not belong to your council");
    if (request.status !== "pending") throw ApiError.conflict(`Request is already ${request.status}, cannot approve`);

    const nearest = await client.query<{ id: string }>(
      `SELECT c.id FROM councils c, certificate_requests r
       WHERE r.id = $1 AND c.is_active = true
       ORDER BY c.location <-> r.citizen_location
       LIMIT 1`,
      [requestId]
    );
    if (nearest.rowCount === 0) throw ApiError.internal("No active council found to route this request to");
    const destinationCouncilId = nearest.rows[0].id;

    await client.query(
      `UPDATE certificate_requests
       SET status = 'in_transit', destination_council_id = $1, processed_at = now()
       WHERE id = $2`,
      [destinationCouncilId, requestId]
    );
    await client.query(
      "INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata) VALUES ($1, 'REQUEST_APPROVED', 'certificate_requests', $2, $3)",
      [adminUserId, requestId, JSON.stringify({ destinationCouncilId })]
    );

    const updated = await client.query<RequestRow>(`SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.id = $1`, [requestId]);
    return updated.rows[0];
  });
}

export async function reject(requestId: string, adminUserId: string, reason: string): Promise<RequestRow> {
  const councilId = await getManagedCouncilId(adminUserId);

  return withTransaction(async (client) => {
    const existing = await client.query<RequestRow>("SELECT * FROM certificate_requests WHERE id = $1 FOR UPDATE", [requestId]);
    if (existing.rowCount === 0) throw ApiError.notFound("Request not found");
    const request = existing.rows[0];

    if (request.origin_council_id !== councilId) throw ApiError.forbidden("This request does not belong to your council");
    if (request.status !== "pending") throw ApiError.conflict(`Request is already ${request.status}, cannot reject`);

    await client.query(
      "UPDATE certificate_requests SET status = 'rejected', rejection_reason = $1, processed_at = now() WHERE id = $2",
      [reason, requestId]
    );
    await client.query(
      "INSERT INTO audit_logs (actor_id, action, entity, entity_id, metadata) VALUES ($1, 'REQUEST_REJECTED', 'certificate_requests', $2, $3)",
      [adminUserId, requestId, JSON.stringify({ reason })]
    );

    const updated = await client.query<RequestRow>(`SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.id = $1`, [requestId]);
    return updated.rows[0];
  });
}

export async function markReady(requestId: string, adminUserId: string): Promise<RequestRow> {
  const councilId = await getManagedCouncilId(adminUserId);

  return withTransaction(async (client) => {
    const existing = await client.query<RequestRow>("SELECT * FROM certificate_requests WHERE id = $1 FOR UPDATE", [requestId]);
    if (existing.rowCount === 0) throw ApiError.notFound("Request not found");
    const request = existing.rows[0];

    if (request.destination_council_id !== councilId) throw ApiError.forbidden("This request is not routed to your council");
    if (request.status !== "in_transit") throw ApiError.conflict(`Request is ${request.status}, cannot mark ready`);

    await client.query("UPDATE certificate_requests SET status = 'ready_for_pickup', ready_at = now() WHERE id = $1", [requestId]);
    await insertAudit(adminUserId, "REQUEST_READY_FOR_PICKUP", requestId);

    const updated = await client.query<RequestRow>(`SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.id = $1`, [requestId]);
    return updated.rows[0];
  });
}

export async function complete(requestId: string, adminUserId: string): Promise<RequestRow> {
  const councilId = await getManagedCouncilId(adminUserId);

  return withTransaction(async (client) => {
    const existing = await client.query<RequestRow>("SELECT * FROM certificate_requests WHERE id = $1 FOR UPDATE", [requestId]);
    if (existing.rowCount === 0) throw ApiError.notFound("Request not found");
    const request = existing.rows[0];

    if (request.destination_council_id !== councilId) throw ApiError.forbidden("This request is not routed to your council");
    if (request.status !== "ready_for_pickup") throw ApiError.conflict(`Request is ${request.status}, cannot complete`);

    await client.query("UPDATE certificate_requests SET status = 'completed', completed_at = now() WHERE id = $1", [requestId]);
    await insertAudit(adminUserId, "REQUEST_COMPLETED", requestId);

    const updated = await client.query<RequestRow>(`SELECT ${JOIN_SELECT} ${JOIN_CLAUSE} WHERE r.id = $1`, [requestId]);
    return updated.rows[0];
  });
}
