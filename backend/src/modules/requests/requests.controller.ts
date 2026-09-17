import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { toPublicRequest } from "./requests.types";
import * as requestsService from "./requests.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const request = await requestsService.create(req.user.id, req.body);
  sendSuccess(res, toPublicRequest(request), "Request submitted", 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const requests = await requestsService.list(req.user);
  sendSuccess(res, requests.map(toPublicRequest), "Requests retrieved");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const request = await requestsService.getById(req.params.id, req.user);
  sendSuccess(res, toPublicRequest(request), "Request retrieved");
});

export const approve = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const request = await requestsService.approve(req.params.id, req.user.id);
  sendSuccess(res, toPublicRequest(request), "Request approved and routed to the nearest council");
});

export const reject = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const request = await requestsService.reject(req.params.id, req.user.id, req.body.reason);
  sendSuccess(res, toPublicRequest(request), "Request rejected");
});

export const markReady = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const request = await requestsService.markReady(req.params.id, req.user.id);
  sendSuccess(res, toPublicRequest(request), "Request marked ready for pickup");
});

export const complete = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const request = await requestsService.complete(req.params.id, req.user.id);
  sendSuccess(res, toPublicRequest(request), "Request completed");
});
