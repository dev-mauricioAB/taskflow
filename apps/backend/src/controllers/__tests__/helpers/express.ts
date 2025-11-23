import type { Request, Response } from "express";
import { vi } from "vitest";

export function mockReq<TBody = any, TParams = any, TQuery = any>(
  data: Partial<Request<TParams, any, TBody, TQuery>> = {},
) {
  return {
    params: {} as any,
    body: {} as any,
    query: {} as any,
    ...data,
  } as unknown as Request<TParams, any, TBody, TQuery>;
}

export function mockRes<ResBody = any>() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(), // add this line
    setHeader: vi.fn().mockReturnThis(),
  } as unknown as Response<ResBody>;
  return res;
}
