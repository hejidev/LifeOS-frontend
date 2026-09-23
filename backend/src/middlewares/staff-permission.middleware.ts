import type { Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import type { StaffRequest } from "./staff-session.middleware";
import { staffHasPermission, type StaffPermission } from "../lib/staff-permissions";

export function requireStaffPermission(permission: StaffPermission) {
  return (req: StaffRequest, _res: Response, next: NextFunction) => {
    const role = req.staff?.role;
    if (!role || !staffHasPermission(role, permission)) {
      return next(new AppError("Your role doesn't have access to this action", 403));
    }
    next();
  };
}