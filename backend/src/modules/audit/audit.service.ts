import { ApiError } from "../../utils/ApiError";
// import { query } from "../../config/db"; // uncomment once DB schema/queries are wired up

// AuditLog data-access + business logic.
// Deliberately throws "not implemented" for now - real SQL queries
// (parameterized, via config/db.ts) are added in the Database Implementation step.

export async function list(): Promise<unknown[]> {
  throw ApiError.internal("audit.service.list not yet implemented");
}

export async function getById(id: string): Promise<unknown> {
  throw ApiError.internal("audit.service.getById not yet implemented");
}

export async function create(data: unknown): Promise<unknown> {
  throw ApiError.internal("audit.service.create not yet implemented");
}

export async function update(id: string, data: unknown): Promise<unknown> {
  throw ApiError.internal("audit.service.update not yet implemented");
}
