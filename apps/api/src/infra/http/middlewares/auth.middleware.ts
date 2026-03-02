import { Request, Response, NextFunction } from "express";
import { DomainError, prisma } from "@repo/infra";

export async function extractAuthUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = req.kauth?.grant?.access_token as any;
    const content = token?.content ?? token?.payload;
    const sub = content?.sub;

    if (!sub) {
      return next(
        new DomainError({
          code: "UNAUTHORIZED",
          message: "Missing auth token",
        }),
      );
    }

    // Try to find existing user
    const user = await prisma.user.findUnique({
      where: { keycloakUserId: sub },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return next(
        new DomainError({
          code: "UNAUTHORIZED",
          message: "User not found in DB. Please contact support.",
        }),
      );
    }

    req.authUser = {
      id: user.id,
      keycloakUserId: sub,
      email: user.email,
      name: user.name,
      roles: content?.realm_access?.roles ?? [],
    };

    return next();
  } catch (err) {
    return next(err);
  }
}
