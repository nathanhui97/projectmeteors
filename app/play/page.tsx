import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserDecks } from "@/lib/decks/queries";
import type { QueueEntry } from "@/lib/types";
import { PlayClient } from "./_components/PlayClient";

export const metadata = { title: "Play — Project V" };

export default async function PlayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const decks = await getUserDecks();

  // Resume an active queue entry if the user navigated away while waiting
  const { data: activeQueue } = await supabase
    .from("matchmaking_queue")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "waiting")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return (
    <PlayClient
      decks={decks}
      activeQueue={(activeQueue as QueueEntry | null) ?? null}
    />
  );
}
