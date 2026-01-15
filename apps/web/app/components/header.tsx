"use client";

import { useSession, signOut } from "next-auth/react";

export function AppHeader() {
  const { data: session, status } = useSession();
  const userLabel = session?.user?.name ?? session?.user?.email ?? "User";

  return (
    <header className="sticky top-0 z-40 flex justify-center bg-slate-950/80 backdrop-blur">
      <div className="mt-3 mb-4 flex w-full max-w-5xl items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-2 shadow-lg">
        {/* Left: app title */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-50 tracking-tight">
            TaskFlow
          </span>
          <span className="text-[11px] text-slate-400">
            Keycloak-secured workspace
          </span>
        </div>

        {/* Right: user + logout */}
        <div className="flex items-center gap-3">
          {status === "loading" && (
            <div className="h-7 w-24 animate-pulse rounded-full bg-slate-700/60" />
          )}

          {status === "authenticated" && (
            <>
              <div className="flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-slate-100 border border-slate-700/70">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold text-slate-100">
                  {userLabel.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-35 truncate">{userLabel}</span>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="cursor-pointer rounded-full bg-rose-500 px-3 py-1 text-xs font-medium text-white hover:bg-rose-600 transition"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
