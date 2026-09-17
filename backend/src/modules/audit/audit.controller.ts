import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as auditService from "./audit.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  const logs = await auditService.list();
  sendSuccess(res, logs, "Audit log retrieved");
});
