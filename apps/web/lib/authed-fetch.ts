"use client";

import { getSession, signOut } from "next-auth/react";

export async function authedFetch(input: RequestInfo, init: RequestInit = {}) {
  const session = await getSession();
  const token = session?.accessToken as string | undefined;

  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    await signOut({ callbackUrl: "/auth/login" });
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res;
}
