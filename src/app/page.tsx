import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-52px)] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-bold">ExpoBridge</h1>
      <p className="mt-4 max-w-lg text-lg text-gray-600">
        Global B2B Exhibition, Trade &amp; Sourcing Platform
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/register"
          className="rounded bg-black px-6 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Get Started
        </Link>
        <Link
          href="/login"
          className="rounded border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Log In
        </Link>
      </div>
    </main>
  );
}
