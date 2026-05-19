import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-50 p-8 dark:bg-neutral-950">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          projectmeteors
        </h1>

        {user ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Signed in as{" "}
              <span className="font-mono text-neutral-900 dark:text-neutral-100">
                {user.email}
              </span>
            </p>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              You are not signed in.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
