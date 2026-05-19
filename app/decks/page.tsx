import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserDecks } from "@/lib/decks/queries";

export default async function DecksPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const decks = await getUserDecks();

  return (
    <main className="min-h-screen bg-neutral-50 p-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            My Decks
          </h1>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-neutral-700 hover:underline dark:text-neutral-300"
            >
              Home
            </Link>
            <Link
              href="/decks/new"
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              New deck
            </Link>
          </div>
        </header>

        {decks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-neutral-700 dark:text-neutral-300">
              You don&apos;t have any decks yet.
            </p>
            <Link
              href="/decks/new"
              className="mt-4 inline-block rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Create your first deck
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {decks.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/decks/${d.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {d.name}
                  </span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Updated {new Date(d.updated_at).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
