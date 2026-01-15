"use client";

import { useUsers } from "@/hooks/useUsers";

export default function UsersList() {
  const { data, isLoading, isError, error } = useUsers();
  if (isLoading) return <p>Loading...</p>;

  const users = data?.data || [];

  if (isError)
    return (
      <p>Error: {error instanceof Error ? error.message : "Unknown error"}</p>
    );

  return (
    <ul>
      {users.length === 0 ? <p>No users found.</p> : null}
      {users.map((user) => (
        <li key={user.id}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
}
