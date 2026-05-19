"use client";

import { useState } from "react";

const STEPS = [
  {
    number: "01",
    title: "Camera overhead",
    body: "Mount directly above your playmat, pointing straight down so the whole play area is in frame. A phone on a box, a webcam arm, or a tripod all work.",
    diagram: <OverheadDiagram />,
  },
  {
    number: "02",
    title: "Use a phone or webcam — not your laptop",
    body: "Your built-in laptop camera faces you, not your cards. Use a separate device you can aim downward while still seeing your screen.",
    diagram: <DeviceDiagram />,
  },
  {
    number: "03",
    title: "Light it evenly",
    body: "Spread light from multiple sides — one harsh bulb creates glare and shadows. Natural window light or a ring light both work well.",
    diagram: <LightingDiagram />,
  },
  {
    number: "04",
    title: "Hand above the table — always",
    body: "Your hand of cards must stay visible above the table at all times. Hiding cards below the table is considered cheating and grounds for a match dispute.",
    diagram: <HandDiagram />,
  },
  {
    number: "05",
    title: "Test before you click Ready",
    body: "Open your camera preview and check: full mat in frame, even lighting, no glare spots. Fix it now — not in the middle of a match.",
    diagram: <TestDiagram />,
  },
];

export function CameraReminder() {
  const [step, setStep]             = useState(0);
  const [direction, setDirection]   = useState<"fwd" | "back">("fwd");
  const [animKey, setAnimKey]       = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const [dismissed, setDismissed]   = useState(false);

  function goTo(next: number) {
    setDirection(next > step ? "fwd" : "back");
    setAnimKey((k) => k + 1);
    setStep(next);
  }

  function handleDismiss() {
    setDismissing(true);
    setTimeout(() => setDismissed(true), 350);
  }

  if (dismissed) return null;

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;

  return (
    <div
      className="w-full max-w-2xl"
      style={{
        animation: dismissing
          ? "slide-down-fade 0.35s ease both"
          : "slide-up-fade 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both",
      }}
    >
      {/* Subtle white-toned border wrapper */}
      <div className="relative rounded-2xl p-px">
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04), rgba(255,255,255,0.08))",
          }}
        />

        <div className="relative rounded-2xl bg-neutral-900 p-5">

          {/* ── Header ── */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-neutral-400">
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <span className="text-sm font-semibold text-neutral-100">Camera setup</span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* ── Step content ── */}
          <div
            key={animKey}
            className="flex gap-5"
            style={{
              animation: `${direction === "fwd" ? "slide-from-right" : "slide-from-left"} 0.28s ease both`,
            }}
          >
            {/* Diagram */}
            <div className="flex w-40 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-800/50 py-3">
              {current.diagram}
            </div>

            {/* Text */}
            <div className="flex flex-1 flex-col justify-center">
              <p className="mb-1 font-mono text-xs font-bold text-neutral-500">
                {current.number} / {String(STEPS.length).padStart(2, "0")}
              </p>
              <h3 className="mb-2 text-base font-semibold leading-snug text-neutral-100">
                {current.title}
              </h3>
              <p className="text-sm leading-relaxed text-neutral-400">
                {current.body}
              </p>
            </div>
          </div>

          {/* ── Footer nav ── */}
          <div className="mt-4 flex items-center justify-between border-t border-neutral-800 pt-4">
            {/* Prev */}
            <button
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-0"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 010 1.414L6.414 8l3.879 3.879a1 1 0 01-1.414 1.414l-4.586-4.586a1 1 0 010-1.414l4.586-4.586a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back
            </button>

            {/* Dots */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-200 ${
                    i === step
                      ? "h-2 w-5 bg-neutral-100"
                      : "h-2 w-2 bg-neutral-700 hover:bg-neutral-500"
                  }`}
                />
              ))}
            </div>

            {/* Next / Got it */}
            {isLast ? (
              <button
                onClick={handleDismiss}
                className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-white transition-colors"
              >
                Got it
              </button>
            ) : (
              <button
                onClick={() => goTo(step + 1)}
                className="flex items-center gap-1 text-xs text-neutral-300 hover:text-white transition-colors"
              >
                Next
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M5.707 3.293a1 1 0 000 1.414L9.586 8 5.707 11.879a1 1 0 001.414 1.414l4.586-4.586a1 1 0 000-1.414L7.121 3.293a1 1 0 00-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Diagrams — grayscale palette ─────────────────────────────────────────── */

function OverheadDiagram() {
  return (
    <svg viewBox="0 0 120 100" className="w-full max-w-[120px]" aria-hidden="true">
      {/* Playmat */}
      <rect x="15" y="50" width="90" height="42" rx="5" fill="#1a1a1a" stroke="#555" strokeWidth="1.5" />
      {/* Cards on mat */}
      <rect x="24" y="59" width="16" height="22" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="46" y="59" width="16" height="22" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="68" y="59" width="16" height="22" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera body */}
      <rect x="44" y="6" width="32" height="22" rx="4" fill="#333" stroke="#888" strokeWidth="1.5" />
      {/* Lens ring */}
      <circle cx="60" cy="17" r="6" fill="#1a1a1a" stroke="#aaa" strokeWidth="1.5" />
      {/* Lens highlight */}
      <circle cx="60" cy="17" r="2.5" fill="#e5e5e5" />
      {/* Arrow */}
      <line x1="60" y1="29" x2="60" y2="46" stroke="#777" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M55 42 L60 48 L65 42" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeviceDiagram() {
  return (
    <svg viewBox="0 0 120 100" className="w-full max-w-[120px]" aria-hidden="true">
      {/* Phone */}
      <rect x="8" y="14" width="28" height="52" rx="4" fill="#2a2a2a" stroke="#888" strokeWidth="1.5" />
      <rect x="11" y="19" width="22" height="38" rx="2" fill="#111" />
      <circle cx="22" cy="16.5" r="1.5" fill="#ccc" />
      {/* Check */}
      <circle cx="22" cy="80" r="7" fill="#e5e5e5" />
      <path d="M18 80 L21.5 83.5 L27 76" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Divider */}
      <line x1="60" y1="12" x2="60" y2="92" stroke="#333" strokeWidth="1" strokeDasharray="3 2" />
      {/* Laptop */}
      <rect x="68" y="16" width="44" height="32" rx="3" fill="#2a2a2a" stroke="#888" strokeWidth="1.5" />
      <rect x="71" y="19" width="38" height="26" rx="1" fill="#111" />
      {/* Face on screen (facing user, not mat) */}
      <circle cx="90" cy="31" r="7" fill="none" stroke="#444" strokeWidth="1" />
      <circle cx="87" cy="29" r="1" fill="#444" />
      <circle cx="93" cy="29" r="1" fill="#444" />
      <path d="M86 34 Q90 37 94 34" fill="none" stroke="#444" strokeWidth="1" strokeLinecap="round" />
      <rect x="66" y="48" width="48" height="5" rx="2" fill="#2a2a2a" stroke="#666" strokeWidth="1" />
      {/* X */}
      <circle cx="90" cy="80" r="7" fill="#2a2a2a" stroke="#666" strokeWidth="1" />
      <path d="M86 76 L94 84 M94 76 L86 84" stroke="#e5e5e5" strokeWidth="1.8" strokeLinecap="round" />
      <text x="22" y="96" textAnchor="middle" fill="#aaa" fontSize="7" fontFamily="system-ui">Phone ✓</text>
      <text x="90" y="72" textAnchor="middle" fill="#666" fontSize="7" fontFamily="system-ui">Laptop ✗</text>
    </svg>
  );
}

function LightingDiagram() {
  return (
    <svg viewBox="0 0 120 100" className="w-full max-w-[120px]" aria-hidden="true">
      {/* Good: even lighting */}
      <rect x="6" y="44" width="48" height="30" rx="4" fill="#1a1a1a" stroke="#555" strokeWidth="1" />
      {/* Even tint overlay */}
      <rect x="6" y="44" width="48" height="30" rx="4" fill="#fff" opacity="0.06" />
      {/* Three light sources */}
      <circle cx="12" cy="16" r="5" fill="#e5e5e5" opacity="0.9" />
      <line x1="12" y1="22" x2="16" y2="40" stroke="#888" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="30" cy="10" r="5" fill="#e5e5e5" opacity="0.9" />
      <line x1="30" y1="16" x2="30" y2="40" stroke="#888" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="48" cy="16" r="5" fill="#e5e5e5" opacity="0.9" />
      <line x1="48" y1="22" x2="44" y2="40" stroke="#888" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      {/* Check */}
      <circle cx="30" cy="84" r="7" fill="#e5e5e5" />
      <path d="M26 84 L29.5 87.5 L35 81" stroke="#111" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Divider */}
      <line x1="66" y1="8" x2="66" y2="96" stroke="#333" strokeWidth="1" strokeDasharray="3 2" />
      {/* Bad: single harsh light */}
      <rect x="72" y="44" width="42" height="30" rx="4" fill="#111" stroke="#444" strokeWidth="1" />
      {/* Harsh centre hotspot */}
      <ellipse cx="93" cy="59" rx="12" ry="8" fill="#fff" opacity="0.12" />
      <circle cx="93" cy="14" r="6" fill="#e5e5e5" />
      <line x1="93" y1="21" x2="93" y2="40" stroke="#888" strokeWidth="2" strokeDasharray="2 2" opacity="0.7" />
      {/* X */}
      <circle cx="93" cy="84" r="7" fill="#2a2a2a" stroke="#666" strokeWidth="1" />
      <path d="M89 80 L97 88 M97 80 L89 88" stroke="#e5e5e5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HandDiagram() {
  return (
    <svg viewBox="0 0 120 100" className="w-full max-w-[120px]" aria-hidden="true">
      {/* Table line */}
      <line x1="6" y1="60" x2="114" y2="60" stroke="#444" strokeWidth="2" />
      <text x="60" y="70" textAnchor="middle" fill="#555" fontSize="6" fontFamily="system-ui">table</text>
      {/* Good: hand visible above */}
      <rect x="10" y="30" width="6" height="18" rx="3" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="18" y="26" width="6" height="22" rx="3" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="26" y="26" width="6" height="22" rx="3" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="34" y="30" width="6" height="18" rx="3" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="10" y="44" width="30" height="16" rx="4" fill="#333" stroke="#666" strokeWidth="1" />
      {/* Cards in hand */}
      <rect x="8" y="28" width="10" height="16" rx="2" fill="#222" stroke="#777" strokeWidth="1" transform="rotate(-12 13 36)" />
      <rect x="18" y="24" width="10" height="16" rx="2" fill="#222" stroke="#777" strokeWidth="1" transform="rotate(-4 23 32)" />
      <rect x="28" y="24" width="10" height="16" rx="2" fill="#222" stroke="#777" strokeWidth="1" transform="rotate(4 33 32)" />
      {/* Check */}
      <circle cx="25" cy="86" r="7" fill="#e5e5e5" />
      <path d="M21 86 L24.5 89.5 L30 83" stroke="#111" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Divider */}
      <line x1="60" y1="20" x2="60" y2="96" stroke="#333" strokeWidth="1" strokeDasharray="3 2" />
      {/* Bad: hand hidden under table */}
      <rect x="72" y="56" width="36" height="10" rx="3" fill="#333" stroke="#555" strokeWidth="1" opacity="0.4" />
      {/* Cover (under table) */}
      <rect x="62" y="62" width="56" height="26" fill="#111" />
      <text x="90" y="78" textAnchor="middle" fill="#555" fontSize="14" fontFamily="system-ui">?</text>
      {/* X */}
      <circle cx="90" cy="86" r="7" fill="#2a2a2a" stroke="#555" strokeWidth="1" />
      <path d="M86 82 L94 90 M94 82 L86 90" stroke="#e5e5e5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TestDiagram() {
  return (
    <svg viewBox="0 0 120 100" className="w-full max-w-[120px]" aria-hidden="true">
      {/* Phone/camera */}
      <rect x="8" y="14" width="30" height="52" rx="4" fill="#2a2a2a" stroke="#888" strokeWidth="1.5" />
      <rect x="11" y="19" width="24" height="40" rx="2" fill="#111" />
      <circle cx="23" cy="16.5" r="1.5" fill="#ccc" />
      {/* Playmat view on screen */}
      <rect x="13" y="23" width="20" height="28" rx="1" fill="#1a1a1a" />
      <rect x="15" y="26" width="7" height="10" rx="1" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
      <rect x="24" y="26" width="7" height="10" rx="1" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
      {/* Arrow */}
      <path d="M44 40 L56 40" stroke="#555" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M53 36 L58 40 L53 44" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Checklist */}
      <rect x="60" y="18" width="52" height="60" rx="5" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
      {/* Item 1 done */}
      <circle cx="72" cy="32" r="4" fill="#e5e5e5" />
      <path d="M69 32 L71.5 34.5 L75 29" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="80" y="29" width="26" height="3" rx="1.5" fill="#444" />
      {/* Item 2 done */}
      <circle cx="72" cy="48" r="4" fill="#e5e5e5" />
      <path d="M69 48 L71.5 50.5 L75 45" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="80" y="45" width="22" height="3" rx="1.5" fill="#444" />
      {/* Item 3 pending */}
      <circle cx="72" cy="64" r="4" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="80" y="61" width="26" height="3" rx="1.5" fill="#333" />
      {/* Big check */}
      <circle cx="86" cy="90" r="8" fill="#e5e5e5" />
      <path d="M81 90 L85.5 94.5 L92 85" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
