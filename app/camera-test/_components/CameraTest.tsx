"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "requesting" | "ok" | "denied" | "error";

export function CameraTest() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => { return () => stopAll(); }, []);

  function stopAll() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startTest() {
    setStatus("requesting");
    setErrorMsg("");
    setMicLevel(0);
    setHasVideo(false);
    setHasAudio(false);
    stopAll();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      setHasVideo(!!stream.getVideoTracks()[0]?.enabled);
      setHasAudio(!!stream.getAudioTracks()[0]?.enabled);

      if (videoRef.current) videoRef.current.srcObject = stream;

      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      function tick() {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animRef.current = requestAnimationFrame(tick);
      }
      tick();

      setStatus("ok");
    } catch (e: any) {
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setStatus("denied");
      } else {
        setStatus("error");
        setErrorMsg(e?.message ?? String(e));
      }
    }
  }

  function handleStop() {
    stopAll();
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
    setMicLevel(0);
    setHasVideo(false);
    setHasAudio(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 p-8">
      <div className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">Camera &amp; Mic Test</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Check your camera and microphone before joining a game.
          </p>
        </div>

        {/* Video preview */}
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {status !== "ok" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-neutral-600">
                {status === "requesting" ? "Requesting access…" : "No preview"}
              </p>
            </div>
          )}
        </div>

        {/* Camera + mic indicators */}
        {status === "ok" && (
          <div className="space-y-3">
            <Indicator label="Camera" ok={hasVideo} />
            <Indicator label="Microphone" ok={hasAudio} />
            <div className="space-y-1.5">
              <p className="text-xs text-neutral-500">Mic level — speak to test</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-100 transition-all duration-75"
                  style={{ width: `${micLevel}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {status === "denied" && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
            <p className="text-sm font-medium text-neutral-200">Access denied</p>
            <p className="mt-1 text-xs text-neutral-500">
              Allow camera and microphone access in your browser settings, then try again.
            </p>
          </div>
        )}

        {status === "error" && (
          <p className="text-sm text-red-400">{errorMsg || "Something went wrong."}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {status !== "ok" ? (
            <button
              onClick={startTest}
              disabled={status === "requesting"}
              className="flex-1 rounded-md bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
            >
              {status === "requesting" ? "Requesting…" : "Start Test"}
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex-1 rounded-md border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800"
            >
              Stop
            </button>
          )}
          <button
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800"
          >
            ← Back
          </button>
        </div>
      </div>
    </main>
  );
}

function Indicator({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2 w-2 flex-shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-neutral-600"}`} />
      <span className="text-sm text-neutral-400">{label}</span>
      <span className={`ml-auto text-xs font-medium ${ok ? "text-emerald-400" : "text-neutral-600"}`}>
        {ok ? "Ready" : "Not detected"}
      </span>
    </div>
  );
}
