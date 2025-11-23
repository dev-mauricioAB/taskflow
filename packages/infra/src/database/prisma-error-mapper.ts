import { Prisma } from "@prisma/client";
import { ERROR_CODES, httpStatusByCode } from "@repo/shared";
import { DomainError } from "../errors";

export function mapPrismaToDomainError(err: unknown): DomainError {
  debugger

  // Handle Prisma Known Request Errors (P2xxx codes)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": // Unique constraint violation
        return new DomainError({
          code: ERROR_CODES.EMAIL_IN_USE, // or more generic: CONFLICT
          message: "Email already in use",
          status: 409,
          details: { target: err.meta?.target },
          cause: err,
        });

      case "P2025": // Record not found (delete/update)
        return new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: "Resource not found",
          status: 404,
          cause: err,
        });

      case "P2003": // Foreign key constraint failed
        return new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: "Related resource does not exist",
          status: 400,
          details: { field: err.meta?.field_name },
          cause: err,
        });

      case "P2011": // Null constraint violation
        return new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: "Required field is missing",
          status: 400,
          details: { field: err.meta?.column_name },
          cause: err,
        });

      case "P2014": // Invalid relation
        return new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: "Invalid relationship between records",
          status: 400,
          cause: err,
        });

      case "P2000": // Value too long for column
        return new DomainError({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: "Value exceeds maximum length",
          status: 400,
          details: { column: err.meta?.column_name },
          cause: err,
        });

      case "P2001": // Record does not exist (relation)
        return new DomainError({
          code: ERROR_CODES.NOT_FOUND,
          message: "Related record not found",
          status: 404,
          cause: err,
        });

      default:
        // Unknown Prisma error code
        return new DomainError({
          code: ERROR_CODES.CONFLICT, // or create ERROR_CODES.DATABASE_ERROR
          message: "Database constraint conflict",
          status: 409,
          details: { prismaCode: err.code, meta: err.meta },
          cause: err,
        });
    }
  }

  // Handle Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return new DomainError({
      code: ERROR_CODES.VALIDATION_FAILED,
      message: "Invalid input data",
      status: httpStatusByCode.VALIDATION_FAILED,
      cause: err,
    });
  }

  // Handle Prisma Initialization Errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    return new DomainError({
      code: ERROR_CODES.INTERNAL_SERVER_ERROR, // or DATABASE_CONNECTION_ERROR
      message: "Database connection failed",
      status: 500,
      cause: err,
    });
  }

  // Handle Prisma Rust Panic Errors
  if (err instanceof Prisma.PrismaClientRustPanicError) {
    return new DomainError({
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: "Database engine error",
      status: 500,
      cause: err,
    });
  }

  if (err instanceof DomainError) {
    return err; // pass-through for already mapped domain errors
  }

  // Unknown error - should be INTERNAL_SERVER_ERROR
  return new DomainError({
    code: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: "Unexpected database error",
    status: 500,
    cause: err,
  });
}
