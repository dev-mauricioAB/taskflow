"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, ApiResponse, User } from "@repo/shared";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const useUsers = () => {
  return useQuery<ApiResponse<User[]>>({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/users`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const data: ApiResponse<User[]> = await res.json();
      return data;
    },
  });
};
