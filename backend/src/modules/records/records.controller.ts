import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { toPublicRecord } from "./records.types";
import * as recordsService from "./records.service";
import { BulkUploadRow } from "./records.service";

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, dateOfBirth, placeOfBirth } = req.query as Record<string, string | undefined>;
  const records = await recordsService.search({ fullName, dateOfBirth, placeOfBirth });
  sendSuccess(res, records.map(toPublicRecord), "Search results");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const record = await recordsService.getById(req.params.id);
  sendSuccess(res, toPublicRecord(record), "Record retrieved");
});

export const bulkUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No CSV file uploaded (expected multipart field 'file')");

  let rows: BulkUploadRow[];
  try {
    rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    throw ApiError.badRequest("Could not parse CSV file", { error: (err as Error).message });
  }

  if (rows.length === 0) throw ApiError.badRequest("CSV file has no data rows");
  if (rows.length > 5000) throw ApiError.badRequest("CSV too large - split into batches of 5000 rows or fewer");

  const result = await recordsService.bulkUpload(rows);
  sendSuccess(res, result, `Imported ${result.insertedCount} of ${rows.length} rows (${result.errors.length} error(s))`);
});
