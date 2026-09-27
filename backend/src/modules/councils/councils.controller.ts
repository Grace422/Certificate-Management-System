import { Request, Response } from "express";
import { parse } from "csv-parse/sync";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { toPublicCouncil } from "./councils.types";
import * as councilsService from "./councils.service";
import { CouncilBulkUploadRow } from "./councils.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const region = typeof req.query.region === "string" ? req.query.region : undefined;
  const councils = await councilsService.list(region);
  sendSuccess(res, councils.map(toPublicCouncil), "Councils retrieved");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const council = await councilsService.getById(req.params.id);
  sendSuccess(res, toPublicCouncil(council), "Council retrieved");
});

export const nearest = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, limit } = req.query as unknown as { latitude: number; longitude: number; limit: number };
  const councils = await councilsService.findNearest(latitude, longitude, limit);
  sendSuccess(res, councils.map(toPublicCouncil), "Nearest councils retrieved");
});

export const bulkUpload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No CSV file uploaded (expected multipart field 'file')");

  let rows: CouncilBulkUploadRow[];
  try {
    rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    throw ApiError.badRequest("Could not parse CSV file", { error: (err as Error).message });
  }

  if (rows.length === 0) throw ApiError.badRequest("CSV file has no data rows");
  if (rows.length > 2000) throw ApiError.badRequest("CSV too large - split into batches of 2000 rows or fewer");

  const result = await councilsService.bulkUpload(rows);
  sendSuccess(res, result, `Imported ${result.insertedCount} of ${rows.length} rows (${result.errors.length} error(s))`);
});
