// backend/src/infra/http/middlewares/validate.ts
import { NextFunction, Request, Response } from "express";
import { z, ZodError, ZodTypeAny } from "zod";
import { DomainError } from "@repo/infra";

type Schemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

export function validate(schemas: Schemas) {
  const wrapper = z.object({
    body: schemas.body ?? z.any(),
    query: schemas.query ?? z.any(),
    params: schemas.params ?? z.any(),
  });

  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await wrapper.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Assign back safely:
      // - req.body/req.params are plain objects: direct assignment is fine.
      // - req.query is a getter-backed object: merge instead of reassigning.
      if (parsed.body && typeof parsed.body === "object") {
        req.body = parsed.body as any;
      }
      if (parsed.params && typeof parsed.params === "object") {
        req.params = parsed.params as any;
      }
      if (parsed.query && typeof parsed.query === "object") {
        Object.assign(req.query as any, parsed.query);
      }

      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          new DomainError({
            code: "VALIDATION_FAILED",
            message: "Validation failed",
            details: {
              issues: err.issues.map((e) => ({
                path: e.path.join("."),
                code: e.code,
                message: e.message,
              })),
            },
          }),
        );
      }
      return next(err);
    }
  };
}
