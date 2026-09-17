import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as service from "./councils.service";

// Council controller - thin layer: parse request, call service, format response.
// Business logic lives in councils.service.ts, not here.

export const list = asyncHandler(async (req: Request, res: Response) => {
  const items = await service.list();
  sendSuccess(res, items, "Council list retrieved");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.getById(req.params.id);
  sendSuccess(res, item, "Council retrieved");
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.create(req.body);
  sendSuccess(res, item, "Council created", 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const item = await service.update(req.params.id, req.body);
  sendSuccess(res, item, "Council updated");
});
