// pages/index.tsx
import type { NextPage } from "next";
import Link from "next/link";

const HomePage: NextPage = () => {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">TaskFlow</h1>

      <p className="text-gray-600">Welcome! Choose where you want to go.</p>

      <nav className="flex gap-4">
        <Link
          href="/admin"
          className="rounded bg-slate-800 px-4 py-2 text-white"
        >
          Go to Admin
        </Link>

        <Link
          href="/no-permission"
          className="rounded bg-red-600 px-4 py-2 text-white"
        >
          No Permission Demo
        </Link>

        <Link href="/test" className="rounded bg-red-600 px-4 py-2 text-white">
          Test
        </Link>
      </nav>
    </main>
  );
};

export default HomePage;
