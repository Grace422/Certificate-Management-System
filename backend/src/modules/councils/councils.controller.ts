import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { toPublicCouncil } from "./councils.types";
import * as councilsService from "./councils.service";

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
