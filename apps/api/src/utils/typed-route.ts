import { Request, Response, NextFunction, RequestHandler } from "express";

// Params only: Request<P, ResBody={}, ReqBody={}, ReqQuery={}>
export function withParams<P>(
  handler: (
    req: Request<P, {}, {}, {}>,
    res: Response,
    next: NextFunction,
  ) => any,
): RequestHandler {
  return (req, res, next) => handler(req as Request<P, {}, {}, {}>, res, next);
}

// Body only: Request<Params={}, ResBody={}, ReqBody=B, ReqQuery={}>
export function withBody<B>(
  handler: (
    req: Request<{}, {}, B, {}>,
    res: Response,
    next: NextFunction,
  ) => any,
): RequestHandler {
  return (req, res, next) => handler(req as Request<{}, {}, B, {}>, res, next);
}

// Query only: Request<Params={}, ResBody={}, ReqBody={}, ReqQuery=Q>
export function withQuery<Q>(
  handler: (
    req: Request<{}, {}, {}, Q>,
    res: Response,
    next: NextFunction,
  ) => any,
): RequestHandler {
  return (req, res, next) => handler(req as Request<{}, {}, {}, Q>, res, next);
}

// Params + Body
export function withParamsAndBody<P, B>(
  handler: (
    req: Request<P, {}, B, {}>,
    res: Response,
    next: NextFunction,
  ) => any,
): RequestHandler {
  return (req, res, next) => handler(req as Request<P, {}, B, {}>, res, next);
}

// Params + Query
export function withParamsAndQuery<P, Q>(
  handler: (
    req: Request<P, {}, {}, Q>,
    res: Response,
    next: NextFunction,
  ) => any,
): RequestHandler {
  return (req, res, next) => handler(req as Request<P, {}, {}, Q>, res, next);
}

// Body + Query
export function withBodyAndQuery<B, Q>(
  handler: (
    req: Request<{}, {}, B, Q>,
    res: Response,
    next: NextFunction,
  ) => any,
): RequestHandler {
  return (req, res, next) => handler(req as Request<{}, {}, B, Q>, res, next);
}

// Params + Body + Query
export function withParamsBodyQuery<P, B, Q>(
  handler: (
    req: Request<P, {}, B, Q>,
    res: Response,
    next: NextFunction,
  ) => any,
): RequestHandler {
  return (req, res, next) => handler(req as Request<P, {}, B, Q>, res, next);
}
