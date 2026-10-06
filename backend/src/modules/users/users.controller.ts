import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as usersService from "./users.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const users = await usersService.list({ role, search });
  sendSuccess(res, users, "Users retrieved");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getById(req.params.id);
  sendSuccess(res, user, "User retrieved");
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.createAdmin(req.body);
  sendSuccess(res, user, "Staff account created. They must complete MFA setup on first login.", 201);
});
