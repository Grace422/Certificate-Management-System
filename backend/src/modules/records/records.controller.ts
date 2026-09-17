import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./records.service";

// CivilRecord controller - thin layer: parse request, call service, format response.
// Business logic lives in records.service.ts, not here.

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await service.list();
  sendSuccess(res, items, "CivilRecord list retrieved");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.getById(req.params.id);
  sendSuccess(res, item, "CivilRecord retrieved");
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.create(req.body);
  sendSuccess(res, item, "CivilRecord created", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.update(req.params.id, req.body);
  sendSuccess(res, item, "CivilRecord updated");
});
