"use client";

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS, ApiResponse, User } from "@repo/shared";
import { api } from "lib/api";

export const useUsers = () => {
  return useQuery<ApiResponse<User[]>>({
    queryKey: [QUERY_KEYS.USERS],
    queryFn: () => api.get<ApiResponse<User[]>>("/users"),
  });
};
