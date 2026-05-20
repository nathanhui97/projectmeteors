"use client";

import { useEffect, useRef, useState } from "react";

type Props = { roomId: string };

type CallStatus = "loading" | "joining" | "joined" | "no-video" | "error";

export function VideoCall({ roomId }: Props) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callRef = useRef<any>(null);
  const [status, setStatus] = useState<CallStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let dead = false;

    function attachTrack(track: MediaStreamTrack, el: HTMLVideoElement | null) {
      if (!el) return;
      const stream =
        el.srcObject instanceof MediaStream ? el.srcObject : new MediaStream();
      const existing = stream.getTracks().find((t) => t.kind === track.kind);
      if (existing) stream.removeTrack(existing);
      stream.addTrack(track);
      el.srcObject = stream;
    }

    async function boot() {
      const res = await fetch(
        `/api/daily-token?roomId=${encodeURIComponent(roomId)}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 404) {
          if (!dead) setStatus("no-video");
          return;
        }
        if (!dead) {
          setStatus("error");
          setErrorMsg(body.error ?? "Could not start video");
        }
        return;
      }
      const { token, roomUrl } = await res.json();
      if (dead) return;

      const Daily = (await import("@daily-co/daily-js")).default;
      if (dead) return;

      const call = Daily.createCallObject({ audioSource: true, videoSource: true });
      callRef.current = call;

      call.on("track-started", (event: any) => {
        const { participant, track } = event;
        if (!track) return;
        if (participant.local) {
          attachTrack(track, localVideoRef.current);
        } else {
          attachTrack(track, remoteVideoRef.current);
        }
      });

      call.on("track-stopped", (event: any) => {
        const { participant, track } = event;
        if (!track) return;
        const el = participant?.local
          ? localVideoRef.current
          : remoteVideoRef.current;
        if (el && el.srcObject instanceof MediaStream) {
          el.srcObject.removeTrack(track);
        }
      });

      call.on("joined-meeting", () => {
        if (dead) return;
        setStatus("joined");
        // Attach local tracks that may have started before joined-meeting fired
        const local = call.participants()?.local;
        const localVideo = local?.tracks?.video?.persistentTrack ?? local?.videoTrack;
        if (localVideo) attachTrack(localVideo as MediaStreamTrack, localVideoRef.current);
      });

      call.on("error", (e: any) => {
        if (!dead) {
          setStatus("error");
          setErrorMsg(e?.errorMsg ?? "Connection error");
        }
      });

      call.on("camera-error", () => {
        if (!dead) {
          setStatus("error");
          setErrorMsg(
            "Camera or microphone access denied — check your browser permissions.",
          );
        }
      });

      if (!dead) setStatus("joining");
      await call.join({ url: roomUrl, token });
    }

    boot().catch((e) => {
      if (!dead) {
        setStatus("error");
        setErrorMsg(String(e));
      }
    });

    return () => {
      dead = true;
      const c = callRef.current;
      if (c) {
        c.leave().catch(() => {});
        c.destroy().catch(() => {});
        callRef.current = null;
      }
    };
  }, [roomId]);

  if (status === "no-video") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-neutral-600 dark:text-neutral-500">
          No video for this room
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-sm text-red-400">{errorMsg || "Video unavailable"}</p>
        <p className="text-xs text-neutral-500">
          You can still play — use an external call if needed.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-neutral-900">
      {/* Remote participant — fills the panel */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="h-full w-full object-cover"
      />

      {/* Local self-view — PiP bottom-left, muted to prevent echo */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-3 left-3 h-24 w-32 rounded-lg border border-neutral-700 object-cover shadow-lg"
      />

      {(status === "loading" || status === "joining") && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
          <p className="text-sm text-neutral-500">
            {status === "loading" ? "Connecting…" : "Joining call…"}
          </p>
        </div>
      )}
    </div>
  );
}
