import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { toPublicDeclaration } from "./loss.types";
import * as lossService from "./loss.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const declaration = await lossService.create(req.user.id, req.body);
  sendSuccess(res, toPublicDeclaration(declaration), "Declaration submitted for review", 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const declarations = await lossService.list(req.user);
  sendSuccess(res, declarations.map(toPublicDeclaration), "Declarations retrieved");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const declaration = await lossService.getById(req.params.id, req.user);
  sendSuccess(res, toPublicDeclaration(declaration), "Declaration retrieved");
});

export const verify = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const declaration = await lossService.verify(req.params.id, req.user.id, req.body.notes);
  sendSuccess(res, toPublicDeclaration(declaration), "Declaration verified");
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const declaration = await lossService.reject(req.params.id, req.user.id, req.body.notes);
  sendSuccess(res, toPublicDeclaration(declaration), "Declaration rejected");
});
