// src/interfaces/http/middlewares/error-handler.ts
import { NextFunction, Request, Response } from "express";
import { DomainError } from "@repo/infra";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof DomainError) {
    switch (err.code) {
      case "NOT_FOUND":
        return res.status(404).json({ error: err.message, code: err.code });
      case "EMAIL_IN_USE":
        return res.status(409).json({ error: err.message, code: err.code });
      case "USER_INACTIVE":
        return res
          .status(409)
          .json({ error: err.message, code: err.code, details: err.details });
      case "VALIDATION_FAILED":
        return res
          .status(400)
          .json({ error: err.message, code: err.code, details: err.details });
      default:
        return res
          .status(400)
          .json({ error: err.message, code: err.code, details: err.details });
    }
  }
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002")
      return res
        .status(409)
        .json({ error: "Unique constraint violated", code: err.code });
    if (err.code === "P2025")
      return res
        .status(404)
        .json({ error: "Record not found", code: err.code });
  }
  const message = err instanceof Error ? err.message : "Internal Server Error";
  return res.status(500).json({ error: message });
}
