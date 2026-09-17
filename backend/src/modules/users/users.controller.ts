import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as usersService from "./users.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const users = await usersService.list();
  sendSuccess(res, users, "Staff accounts retrieved");
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.getById(req.params.id);
  sendSuccess(res, user, "User retrieved");
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const user = await usersService.createAdmin(req.body);
  sendSuccess(res, user, "Staff account created. They must complete MFA setup on first login.", 201);
});
