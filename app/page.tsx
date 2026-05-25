import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-neutral-100">Project V</h1>
            <p className="text-sm text-neutral-500">Gundam TCG — online webcam play</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Signed in as</p>
            <p className="text-sm font-medium text-neutral-200 truncate">{user.email}</p>
          </div>

          <div className="space-y-3">
            <Link
              href="/rooms"
              className="flex w-full items-center justify-center rounded-xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-900 hover:bg-white transition-colors"
            >
              Play
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/decks"
                className="flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
              >
                My Decks
              </Link>
              <Link
                href="/history"
                className="flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
              >
                Match History
              </Link>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="w-full rounded-xl border border-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-500 hover:text-neutral-300 hover:border-neutral-700 transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-neutral-950">
      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-lg space-y-6">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold tracking-tight text-neutral-100">
              Project V
            </h1>
            <p className="text-lg text-neutral-400">
              Play Gundam TCG online with your webcam. Build your deck, create a room, and battle face-to-face from anywhere.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <Link
              href="/login"
              className="w-full max-w-xs rounded-xl bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-900 hover:bg-white transition-colors"
            >
              Get started
            </Link>
            <Link
              href="/login"
              className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="border-t border-neutral-800 px-6 py-16">
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
          <Feature
            title="Webcam play"
            description="Live video with your opponent via built-in room — no third-party call needed."
          />
          <Feature
            title="Deck builder"
            description="Browse the full Gundam TCG card catalog and build your 50-card deck."
          />
          <Feature
            title="Match history"
            description="Track your wins and losses across every game you play."
          />
        </div>
      </div>
    </main>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
      <p className="text-sm text-neutral-500">{description}</p>
    </div>
  );
}
