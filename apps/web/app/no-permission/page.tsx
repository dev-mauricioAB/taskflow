"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NoPermissionPage() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (cancelled) return;

    if (secondsLeft <= 0) {
      router.push("/"); // auto-redirect to home
      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft, cancelled, router]);

  const handleStay = () => {
    setCancelled(true); // user chose to stay, stop auto redirect
  };

  const handleGoHomeNow = () => {
    router.push("/");
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">No permission</h1>
      <p>You do not have permission to access this page.</p>

      <p>
        You will be redirected to the home page in{" "}
        <span className="font-semibold">{secondsLeft}</span> seconds.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleStay}
          disabled={cancelled}
          className="rounded bg-gray-200 px-4 py-2"
        >
          {cancelled ? "Stay here" : "Stay here (cancel redirect)"}
        </button>

        <button
          type="button"
          onClick={handleGoHomeNow}
          className="rounded bg-blue-600 px-4 py-2 text-white"
        >
          Go to home now
        </button>
      </div>
    </main>
  );
}
