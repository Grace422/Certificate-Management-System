export type RequestType = "copy" | "reissue";
export type RequestStatus = "pending" | "approved" | "rejected" | "in_transit" | "ready_for_pickup" | "completed";

export interface RequestRow {
  id: string;
  citizen_id: string;
  civil_record_id: string;
  request_type: RequestType;
  status: RequestStatus;
  origin_council_id: string;
  destination_council_id: string | null;
  rejection_reason: string | null;
  requested_at: string;
  processed_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  // Joined fields (present when fetched via the service's SELECT with JOINs)
  record_full_name?: string;
  origin_council_name?: string;
  destination_council_name?: string;
}

export interface PublicRequest {
  id: string;
  requestType: RequestType;
  status: RequestStatus;
  recordFullName?: string;
  originCouncilName?: string;
  destinationCouncilName?: string;
  rejectionReason: string | null;
  requestedAt: string;
  processedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
}

export function toPublicRequest(row: RequestRow): PublicRequest {
  return {
    id: row.id,
    requestType: row.request_type,
    status: row.status,
    recordFullName: row.record_full_name,
    originCouncilName: row.origin_council_name,
    destinationCouncilName: row.destination_council_name,
    rejectionReason: row.rejection_reason,
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
    readyAt: row.ready_at,
    completedAt: row.completed_at
  };
}
