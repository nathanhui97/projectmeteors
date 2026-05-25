// Shared Daily.co API helpers — used by both rooms actions and matchmaking.

const DAILY_API = "https://api.daily.co/v1";

async function dailyFetch(path: string, options?: RequestInit) {
  return fetch(`${DAILY_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      ...options?.headers,
    },
  });
}

export async function createDailyRoom(code: string): Promise<string | null> {
  try {
    const res = await dailyFetch("/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: `projectv-${code.toLowerCase()}`,
        privacy: "private",
        properties: { exp: Math.floor(Date.now() / 1000) + 86400 * 7 },
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.url as string) ?? null;
  } catch {
    return null;
  }
}

export async function deleteDailyRoom(roomUrl: string): Promise<void> {
  try {
    const name = roomUrl.split("/").pop();
    if (!name) return;
    await dailyFetch(`/rooms/${name}`, { method: "DELETE" });
  } catch {
    // best-effort
  }
}
