import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRoom, joinRoom } from "@/lib/rooms/actions";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Game Room
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Create a room and share the code, or join a friend&apos;s room.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        <form action={createRoom}>
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Create Room
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
          <span className="text-xs text-neutral-400">or join with a code</span>
          <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
        </div>

        <form action={joinRoom} className="space-y-3">
          <input
            name="code"
            type="text"
            placeholder="XXXXXX"
            required
            maxLength={6}
            autoComplete="off"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-center font-mono text-lg uppercase tracking-widest text-neutral-900 outline-none placeholder:text-neutral-300 focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-600"
          />
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            Join Room
          </button>
        </form>

        <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
          <a href="/" className="hover:underline">
            ← Back to home
          </a>
          <a href="/history" className="hover:underline">
            Match history
          </a>
        </div>
      </div>
    </main>
  );
}
