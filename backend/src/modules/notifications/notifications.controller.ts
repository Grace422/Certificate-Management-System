import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { ApiError } from "../../utils/ApiError";
import { toPublicNotification } from "./notifications.types";
import * as notificationsService from "./notifications.service";

export const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const [notifications, unread] = await Promise.all([
    notificationsService.listMine(req.user.id),
    notificationsService.unreadCount(req.user.id)
  ]);
  sendSuccess(res, { notifications: notifications.map(toPublicNotification), unreadCount: unread }, "Notifications retrieved");
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await notificationsService.markRead(req.params.id, req.user.id);
  sendSuccess(res, null, "Marked as read");
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await notificationsService.markAllRead(req.user.id);
  sendSuccess(res, null, "All notifications marked as read");
});
