import Link from "next/link";

export const metadata = { title: "Camera Setup Guide — projectmeteors" };

const tips = [
  {
    number: "01",
    title: "Position your camera overhead",
    body: "Mount it directly above your playmat, pointing straight down so the entire play area fits in frame. A phone propped on a box, a webcam on a flexible arm, or a tripod all work great.",
    diagram: <OverheadDiagram />,
  },
  {
    number: "02",
    title: "Use a phone or webcam — not your laptop",
    body: "Your built-in laptop camera faces you, not your cards. You need a separate device you can aim downward while still seeing your screen. A phone held by a clip or leaned against a stack of books is a perfectly good start.",
    diagram: <DeviceDiagram />,
  },
  {
    number: "03",
    title: "Light your playmat evenly",
    body: "A single harsh overhead bulb creates glare and shadows that obscure card text. Spread the light: a ring light, two lamps from opposite sides, or shooting near a window with natural light all work well. Matte sleeves and a dark, plain playmat help too.",
    diagram: <LightingDiagram />,
  },
  {
    number: "04",
    title: "Keep your hand above the table — always",
    body: "Your hand of cards must stay above the table and visible at all times. Hiding cards under the table or out of sight is considered cheating. Your opponent may ask to see your hand count at any point during the game.",
    diagram: <HandDiagram />,
  },
  {
    number: "05",
    title: "Test before entering a match",
    body: "Open your phone's camera (or webcam preview) and check: is the whole mat visible? Is the lighting even with no bright glare spots? Can you read the card names? Fix it now so you're not adjusting mid-game.",
    diagram: <TestDiagram />,
  },
];

export default function SetupGuidePage() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12">
      <div className="mx-auto max-w-2xl">

        {/* Back link */}
        <Link
          href="/rooms"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Rooms
        </Link>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-100">
            Camera Setup Guide
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Five things that make your camera feed clear for your opponent.
          </p>
        </div>

        {/* Tips */}
        <div className="space-y-5">
          {tips.map((tip, i) => (
            <div
              key={tip.number}
              className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition-transform duration-200 hover:-translate-y-0.5 hover:border-neutral-700"
              style={{
                animation: "slide-up-fade 0.5s ease both",
                animationDelay: `${i * 100}ms`,
              }}
            >
              <div className="flex flex-col sm:flex-row">
                {/* Diagram panel */}
                <div className="flex items-center justify-center bg-neutral-800/40 p-6 sm:w-52 sm:flex-shrink-0">
                  {tip.diagram}
                </div>

                {/* Text panel */}
                <div className="flex flex-1 flex-col justify-center p-6">
                  <p className="mb-1 font-mono text-xs font-bold text-neutral-500">
                    {tip.number}
                  </p>
                  <h2 className="mb-2 text-base font-semibold text-neutral-100">
                    {tip.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-neutral-400">
                    {tip.body}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div
          className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-5 text-center"
          style={{
            animation: "slide-up-fade 0.5s ease both",
            animationDelay: `${tips.length * 100 + 60}ms`,
          }}
        >
          <p className="mb-3 text-sm text-neutral-400">
            Setup looks good? Head into a room and start playing.
          </p>
          <Link
            href="/rooms"
            className="inline-block rounded-lg bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-900 hover:bg-white transition-colors"
          >
            Go to Rooms
          </Link>
        </div>
      </div>
    </main>
  );
}

/* ── SVG Diagrams — grayscale palette ───────────────────────────────────── */

function OverheadDiagram() {
  return (
    <svg viewBox="0 0 160 120" className="w-full max-w-[160px]" aria-hidden="true">
      <rect x="20" y="60" width="120" height="50" rx="6" fill="#1a1a1a" stroke="#555" strokeWidth="1.5" />
      <rect x="32" y="71" width="22" height="30" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="62" y="71" width="22" height="30" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="92" y="71" width="22" height="30" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="122" y="71" width="10" height="30" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="60" y="8" width="40" height="26" rx="5" fill="#333" stroke="#888" strokeWidth="1.5" />
      <circle cx="80" cy="21" r="8" fill="#1a1a1a" stroke="#aaa" strokeWidth="1.5" />
      <circle cx="80" cy="21" r="3" fill="#e5e5e5" />
      <line x1="80" y1="36" x2="80" y2="56" stroke="#777" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M75 52 L80 58 L85 52" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeviceDiagram() {
  return (
    <svg viewBox="0 0 160 120" className="w-full max-w-[160px]" aria-hidden="true">
      <rect x="12" y="20" width="36" height="68" rx="5" fill="#2a2a2a" stroke="#888" strokeWidth="1.5" />
      <rect x="16" y="26" width="28" height="50" rx="2" fill="#111" />
      <circle cx="30" cy="23" r="1.5" fill="#ccc" />
      <circle cx="30" cy="100" r="9" fill="#e5e5e5" />
      <path d="M25 100 L29 104 L36 96" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="30" y="116" textAnchor="middle" fill="#888" fontSize="8" fontFamily="system-ui">Phone ✓</text>
      <line x1="80" y1="18" x2="80" y2="108" stroke="#333" strokeWidth="1" strokeDasharray="3 2" />
      <rect x="92" y="22" width="56" height="40" rx="3" fill="#2a2a2a" stroke="#888" strokeWidth="1.5" />
      <rect x="96" y="26" width="48" height="32" rx="1" fill="#111" />
      <circle cx="120" cy="24" r="1.5" fill="#666" />
      <rect x="88" y="62" width="64" height="6" rx="2" fill="#2a2a2a" stroke="#888" strokeWidth="1.5" />
      <circle cx="120" cy="38" r="8" fill="none" stroke="#444" strokeWidth="1" />
      <circle cx="117" cy="36" r="1" fill="#444" />
      <circle cx="123" cy="36" r="1" fill="#444" />
      <path d="M116 41 Q120 44 124 41" fill="none" stroke="#444" strokeWidth="1" strokeLinecap="round" />
      <circle cx="120" cy="100" r="9" fill="#2a2a2a" stroke="#666" strokeWidth="1" />
      <path d="M115 95 L125 105 M125 95 L115 105" stroke="#e5e5e5" strokeWidth="2" strokeLinecap="round" />
      <text x="120" y="116" textAnchor="middle" fill="#555" fontSize="8" fontFamily="system-ui">Laptop ✗</text>
    </svg>
  );
}

function LightingDiagram() {
  return (
    <svg viewBox="0 0 160 120" className="w-full max-w-[160px]" aria-hidden="true">
      <rect x="8" y="54" width="60" height="36" rx="4" fill="#1a1a1a" stroke="#555" strokeWidth="1" />
      <rect x="8" y="54" width="60" height="36" rx="4" fill="#fff" opacity="0.06" />
      <circle cx="16" cy="20" r="6" fill="#e5e5e5" opacity="0.9" />
      <line x1="16" y1="27" x2="20" y2="50" stroke="#888" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="38" cy="14" r="6" fill="#e5e5e5" opacity="0.9" />
      <line x1="38" y1="21" x2="38" y2="50" stroke="#888" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="60" cy="20" r="6" fill="#e5e5e5" opacity="0.9" />
      <line x1="60" y1="27" x2="56" y2="50" stroke="#888" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="38" cy="103" r="8" fill="#e5e5e5" />
      <path d="M33 103 L37 107 L44 98" stroke="#111" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="80" y1="10" x2="80" y2="114" stroke="#333" strokeWidth="1" strokeDasharray="3 2" />
      <rect x="92" y="54" width="60" height="36" rx="4" fill="#111" stroke="#444" strokeWidth="1" />
      <ellipse cx="122" cy="72" rx="18" ry="12" fill="#fff" opacity="0.08" />
      <circle cx="122" cy="20" r="7" fill="#e5e5e5" />
      <line x1="122" y1="28" x2="122" y2="50" stroke="#999" strokeWidth="2" strokeDasharray="2 2" opacity="0.7" />
      <line x1="110" y1="60" x2="104" y2="56" stroke="#fff" strokeWidth="1" opacity="0.3" />
      <line x1="115" y1="58" x2="112" y2="53" stroke="#fff" strokeWidth="1" opacity="0.3" />
      <circle cx="122" cy="103" r="8" fill="#2a2a2a" stroke="#555" strokeWidth="1" />
      <path d="M117 98 L127 108 M127 98 L117 108" stroke="#e5e5e5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HandDiagram() {
  return (
    <svg viewBox="0 0 160 120" className="w-full max-w-[160px]" aria-hidden="true">
      <line x1="8" y1="72" x2="152" y2="72" stroke="#444" strokeWidth="2" />
      <text x="80" y="82" textAnchor="middle" fill="#555" fontSize="7" fontFamily="system-ui">table</text>
      <rect x="14" y="38" width="8" height="22" rx="4" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="24" y="34" width="8" height="26" rx="4" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="34" y="34" width="8" height="26" rx="4" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="44" y="38" width="8" height="22" rx="4" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="14" y="56" width="38" height="18" rx="5" fill="#333" stroke="#666" strokeWidth="1" />
      <rect x="12" y="36" width="12" height="18" rx="2" fill="#222" stroke="#777" strokeWidth="1" transform="rotate(-15 18 45)" />
      <rect x="22" y="32" width="12" height="18" rx="2" fill="#222" stroke="#777" strokeWidth="1" transform="rotate(-5 28 41)" />
      <rect x="32" y="32" width="12" height="18" rx="2" fill="#222" stroke="#777" strokeWidth="1" transform="rotate(5 38 41)" />
      <rect x="42" y="36" width="12" height="18" rx="2" fill="#222" stroke="#777" strokeWidth="1" transform="rotate(15 48 45)" />
      <circle cx="33" cy="104" r="8" fill="#e5e5e5" />
      <path d="M28 104 L32 108 L39 99" stroke="#111" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="80" y1="28" x2="80" y2="116" stroke="#333" strokeWidth="1" strokeDasharray="3 2" />
      <rect x="100" y="68" width="44" height="12" rx="4" fill="#333" stroke="#555" strokeWidth="1" opacity="0.4" />
      <rect x="96" y="54" width="10" height="16" rx="2" fill="#222" stroke="#666" strokeWidth="1" opacity="0.4" />
      <rect x="108" y="52" width="10" height="18" rx="2" fill="#222" stroke="#666" strokeWidth="1" opacity="0.4" />
      <rect x="120" y="54" width="10" height="16" rx="2" fill="#222" stroke="#666" strokeWidth="1" opacity="0.4" />
      <rect x="88" y="70" width="64" height="30" fill="#0a0a0a" />
      <text x="122" y="88" textAnchor="middle" fill="#555" fontSize="14" fontFamily="system-ui">?</text>
      <circle cx="122" cy="104" r="8" fill="#2a2a2a" stroke="#555" strokeWidth="1" />
      <path d="M117 99 L127 109 M127 99 L117 109" stroke="#e5e5e5" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TestDiagram() {
  return (
    <svg viewBox="0 0 160 120" className="w-full max-w-[160px]" aria-hidden="true">
      <rect x="14" y="18" width="38" height="66" rx="5" fill="#2a2a2a" stroke="#888" strokeWidth="1.5" />
      <rect x="18" y="24" width="30" height="50" rx="2" fill="#111" />
      <circle cx="33" cy="21" r="1.5" fill="#ccc" />
      <rect x="20" y="32" width="26" height="34" rx="2" fill="#1a1a1a" />
      <rect x="23" y="36" width="8" height="11" rx="1" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
      <rect x="34" y="36" width="8" height="11" rx="1" fill="#2a2a2a" stroke="#444" strokeWidth="0.5" />
      <path d="M58 51 L78 51" stroke="#555" strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M74 46 L80 51 L74 56" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="82" y="22" width="66" height="76" rx="6" fill="#1a1a1a" stroke="#333" strokeWidth="1.5" />
      <circle cx="94" cy="38" r="5" fill="#e5e5e5" />
      <path d="M91 38 L93.5 40.5 L97.5 35" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="103" y="35" width="36" height="3" rx="1.5" fill="#444" />
      <rect x="103" y="40" width="24" height="2" rx="1" fill="#333" />
      <circle cx="94" cy="58" r="5" fill="#e5e5e5" />
      <path d="M91 58 L93.5 60.5 L97.5 55" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="103" y="55" width="30" height="3" rx="1.5" fill="#444" />
      <rect x="103" y="60" width="20" height="2" rx="1" fill="#333" />
      <circle cx="94" cy="78" r="5" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="103" y="75" width="36" height="3" rx="1.5" fill="#333" />
      <rect x="103" y="80" width="26" height="2" rx="1" fill="#2a2a2a" />
      <circle cx="115" cy="108" r="10" fill="#e5e5e5" />
      <path d="M109 108 L113.5 112.5 L121 103" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
