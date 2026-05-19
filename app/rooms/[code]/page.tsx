import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRoomByCode } from "@/lib/rooms/queries";
import { getUserDecks, getDeckWithCards } from "@/lib/decks/queries";
import { joinRoom } from "@/lib/rooms/actions";
import { RoomLobby } from "./_components/RoomLobby";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const room = await getRoomByCode(code);

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Room &ldquo;{code.toUpperCase()}&rdquo; not found.
          </p>
          <Link
            href="/rooms"
            className="block text-sm text-neutral-500 hover:underline dark:text-neutral-400"
          >
            ← Back to rooms
          </Link>
        </div>
      </main>
    );
  }

  const isHost = user.id === room.host_id;
  const isGuest = user.id === room.guest_id;

  if (!isHost && !isGuest) {
    if (room.guest_id) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
          <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              Room <span className="font-mono font-bold">{room.code}</span> is
              full.
            </p>
            <Link
              href="/rooms"
              className="block text-sm text-neutral-500 hover:underline dark:text-neutral-400"
            >
              ← Back to rooms
            </Link>
          </div>
        </main>
      );
    }

    // Room has space — show a join prompt.
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-8 dark:bg-neutral-950">
        <div className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Join Room{" "}
              <span className="font-mono tracking-widest">{room.code}</span>?
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {room.host_email} is waiting for an opponent.
            </p>
          </div>
          <form action={joinRoom}>
            <input type="hidden" name="code" value={room.code} />
            <button
              type="submit"
              className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Join Room
            </button>
          </form>
          <Link
            href="/rooms"
            className="block text-center text-sm text-neutral-500 hover:underline dark:text-neutral-400"
          >
            Cancel
          </Link>
        </div>
      </main>
    );
  }

  const userDecks = await getUserDecks();
  const role = isHost ? "host" : "guest";
  const myDeckId = isHost ? room.host_deck_id : room.guest_deck_id;
  const myDeck = myDeckId ? await getDeckWithCards(myDeckId) : null;

  return (
    <RoomLobby
      room={room}
      currentUserId={user.id}
      role={role}
      userDecks={userDecks}
      myDeck={myDeck}
    />
  );
}
