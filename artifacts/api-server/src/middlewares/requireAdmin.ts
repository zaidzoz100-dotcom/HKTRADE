import type { NextFunction, Request, Response } from "express";

/**
 * Guards /api/admin/* routes with a shared admin password sent via the
 * `x-admin-password` header. This is intentionally independent of Clerk —
 * the admin panel is a separate, password-gated surface, not a user session.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    res
      .status(500)
      .json({ error: "Admin panel is not configured (ADMIN_PASSWORD is not set)." });
    return;
  }

  const provided = req.header("x-admin-password");
  if (!provided || provided !== expected) {
    res.status(401).json({ error: "Invalid admin password" });
    return;
  }

  next();
}
