export type DeclarationStatus = "pending" | "verified" | "rejected";

export interface LossDeclarationRow {
  id: string;
  citizen_id: string;
  civil_record_id: string | null;
  description: string;
  status: DeclarationStatus;
  linked_request_id: string | null;
  declared_at: string;
  reviewed_at: string | null;
}

export interface PublicLossDeclaration {
  id: string;
  description: string;
  status: DeclarationStatus;
  declaredAt: string;
  reviewedAt: string | null;
}

export function toPublicDeclaration(row: LossDeclarationRow): PublicLossDeclaration {
  return {
    id: row.id,
    description: row.description,
    status: row.status,
    declaredAt: row.declared_at,
    reviewedAt: row.reviewed_at
  };
}
