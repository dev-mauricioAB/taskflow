import { authedFetch } from "./authed-fetch";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function get<TResponse>(path: string): Promise<TResponse> {
  const res = await authedFetch(`${BASE_URL}${path}`);
  return res.json() as Promise<TResponse>;
}

async function post<TBody, TResponse>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const res = await authedFetch(`${BASE_URL}${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return res.json() as Promise<TResponse>;
}

async function put<TBody, TResponse>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const res = await authedFetch(`${BASE_URL}${path}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return res.json() as Promise<TResponse>;
}

async function patch<TBody, TResponse>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  const res = await authedFetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return res.json() as Promise<TResponse>;
}

async function del<TResponse>(path: string): Promise<TResponse> {
  const res = await authedFetch(`${BASE_URL}${path}`, {
    method: "DELETE",
  });
  // some DELETEs return no body; adjust per API
  return res.json() as Promise<TResponse>;
}

export const api = {
  get,
  post,
  put,
  patch,
  delete: del,
};
