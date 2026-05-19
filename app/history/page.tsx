import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: results } = await supabase
    .from("match_results")
    .select("winner_id, finished_at")
    .or(`host_id.eq.${user.id},guest_id.eq.${user.id}`)
    .order("finished_at", { ascending: false });

  const matches = results ?? [];
  const wins = matches.filter((r) => r.winner_id === user.id).length;
  const losses = matches.length - wins;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Match History
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Your all-time record
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
          <div className="py-5 text-center">
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {wins}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Wins
            </p>
          </div>
          <div className="py-5 text-center">
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {losses}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Losses
            </p>
          </div>
        </div>

        {matches.length === 0 && (
          <p className="text-center text-sm text-neutral-400 dark:text-neutral-500">
            No matches yet — play a game to see your record here.
          </p>
        )}

        {matches.length > 0 && (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {matches.map((r, i) => {
              const won = r.winner_id === user.id;
              const date = new Date(r.finished_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              });
              return (
                <li key={i} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    {date}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      won
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-neutral-400 dark:text-neutral-500"
                    }`}
                  >
                    {won ? "Win" : "Loss"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <a
          href="/rooms"
          className="block text-center text-sm text-neutral-500 hover:underline dark:text-neutral-400"
        >
          ← Back to rooms
        </a>
      </div>
    </main>
  );
}
