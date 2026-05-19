import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roomId = request.nextUrl.searchParams.get("roomId");
  if (!roomId) return NextResponse.json({ error: "Missing roomId" }, { status: 400 });

  const { data: room } = await supabase
    .from("rooms")
    .select("daily_room_url, host_id, guest_id")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.host_id !== user.id && room.guest_id !== user.id) {
    return NextResponse.json({ error: "Not in this room" }, { status: 403 });
  }
  if (!room.daily_room_url) {
    return NextResponse.json({ error: "No video room" }, { status: 404 });
  }

  const roomName = room.daily_room_url.split("/").pop();

  const tokenRes = await fetch("https://api.daily.co/v1/meeting-tokens", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: user.email,
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Failed to create meeting token" }, { status: 502 });
  }

  const { token } = await tokenRes.json();
  return NextResponse.json({ token, roomUrl: room.daily_room_url });
}
