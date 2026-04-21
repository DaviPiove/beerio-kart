// Hand-drawn inline SVG assets. Kept in one file so imports stay simple.
// All drawn on 100x100 viewBoxes — size with width/height props.

import { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

export function Banana(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <linearGradient id="ban" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff4a1" />
          <stop offset="60%" stopColor="#ffd83d" />
          <stop offset="100%" stopColor="#d69400" />
        </linearGradient>
      </defs>
      <path
        d="M16 78 Q 8 42, 38 18 Q 40 26, 34 32 Q 24 50, 30 70 Q 50 82, 82 66 Q 86 72, 78 80 Q 52 96, 16 78 Z"
        fill="url(#ban)"
        stroke="#1a0030"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d="M80 62 q3 -3 4 -6" stroke="#3a2200" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M36 22 q-2 -5 -1 -8" stroke="#3a2200" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function GreenShell(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <radialGradient id="gshell" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0%" stopColor="#a6f8b4" />
          <stop offset="60%" stopColor="#2ecc71" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="62" rx="42" ry="26" fill="#faf1d4" stroke="#1a0030" strokeWidth="4" />
      <path
        d="M50 18 Q 12 28, 10 56 Q 50 48, 90 56 Q 88 28, 50 18 Z"
        fill="url(#gshell)"
        stroke="#1a0030"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="34" cy="40" r="6" fill="#fff" opacity="0.7" />
      <path d="M10 60 Q 50 52, 90 60" stroke="#1a0030" strokeWidth="4" fill="none" />
    </svg>
  );
}

export function RedShell(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <radialGradient id="rshell" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0%" stopColor="#ffb8b8" />
          <stop offset="60%" stopColor="#e60012" />
          <stop offset="100%" stopColor="#8b0007" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="62" rx="42" ry="26" fill="#faf1d4" stroke="#1a0030" strokeWidth="4" />
      <path
        d="M50 18 Q 12 28, 10 56 Q 50 48, 90 56 Q 88 28, 50 18 Z"
        fill="url(#rshell)"
        stroke="#1a0030"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="34" cy="40" r="6" fill="#fff" opacity="0.75" />
      <path d="M10 60 Q 50 52, 90 60" stroke="#1a0030" strokeWidth="4" fill="none" />
    </svg>
  );
}

export function Star(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <radialGradient id="star-g" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#fff6b8" />
          <stop offset="60%" stopColor="#ffcc00" />
          <stop offset="100%" stopColor="#ff8c00" />
        </radialGradient>
      </defs>
      <path
        d="M50 6 L61 38 L95 40 L68 60 L78 92 L50 74 L22 92 L32 60 L5 40 L39 38 Z"
        fill="url(#star-g)"
        stroke="#1a0030"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="42" r="5" fill="#fff" opacity="0.85" />
    </svg>
  );
}

export function Mushroom(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <radialGradient id="cap" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#ff8a8a" />
          <stop offset="60%" stopColor="#e60012" />
          <stop offset="100%" stopColor="#8b0007" />
        </radialGradient>
      </defs>
      <rect x="30" y="52" width="40" height="34" rx="10" fill="#faf1d4" stroke="#1a0030" strokeWidth="4" />
      <path
        d="M16 56 Q 18 14, 50 10 Q 82 14, 84 56 Z"
        fill="url(#cap)"
        stroke="#1a0030"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="34" cy="30" r="7" fill="#fff8e7" stroke="#1a0030" strokeWidth="3" />
      <circle cx="64" cy="26" r="9" fill="#fff8e7" stroke="#1a0030" strokeWidth="3" />
      <circle cx="40" cy="68" r="3" fill="#1a0030" />
      <circle cx="60" cy="68" r="3" fill="#1a0030" />
    </svg>
  );
}

export function Bolt(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <path
        d="M60 6 L20 56 L46 56 L36 94 L82 38 L54 38 Z"
        fill="#ffcc00"
        stroke="#1a0030"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Coin(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <radialGradient id="coin-g" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#fff6b8" />
          <stop offset="70%" stopColor="#ffcc00" />
          <stop offset="100%" stopColor="#a36b00" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="42" fill="url(#coin-g)" stroke="#1a0030" strokeWidth="4" />
      <circle cx="38" cy="38" r="6" fill="#fff" opacity="0.7" />
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontFamily="Bungee, sans-serif"
        fontSize="34"
        fill="#1a0030"
      >
        ★
      </text>
    </svg>
  );
}

export function CheckerFlag(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <rect x="14" y="12" width="4" height="80" fill="#1a0030" />
      <g stroke="#1a0030" strokeWidth="2">
        {[0, 1, 2, 3, 4, 5].map((r) =>
          [0, 1, 2, 3, 4, 5, 6, 7].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={18 + c * 9}
              y={14 + r * 9}
              width={9}
              height={9}
              fill={(r + c) % 2 === 0 ? "#fff8e7" : "#1a0030"}
            />
          )),
        )}
      </g>
    </svg>
  );
}

export function Trophy(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <linearGradient id="trophy-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6b8" />
          <stop offset="60%" stopColor="#ffcc00" />
          <stop offset="100%" stopColor="#a36b00" />
        </linearGradient>
      </defs>
      <path d="M28 10 h44 v22 q0 22-22 22 q-22 0-22-22 Z" fill="url(#trophy-g)" stroke="#1a0030" strokeWidth="4" />
      <path d="M26 16 q-14 0-14 14 q0 10 14 14" fill="none" stroke="#1a0030" strokeWidth="4" />
      <path d="M74 16 q14 0 14 14 q0 10-14 14" fill="none" stroke="#1a0030" strokeWidth="4" />
      <rect x="42" y="54" width="16" height="12" fill="url(#trophy-g)" stroke="#1a0030" strokeWidth="4" />
      <rect x="26" y="66" width="48" height="10" rx="3" fill="url(#trophy-g)" stroke="#1a0030" strokeWidth="4" />
      <rect x="20" y="78" width="60" height="12" rx="4" fill="#1a0030" />
      <circle cx="42" cy="30" r="4" fill="#fff" opacity="0.8" />
    </svg>
  );
}

export function Beer(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <linearGradient id="beer-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#c88200" />
        </linearGradient>
      </defs>
      {/* foam */}
      <path d="M22 30 q6 -10 16 -6 q6 -10 22 -4 q8 -8 18 -2 q-2 12-14 10 q-4 6-16 4 q-8 6-26 -2 Z"
        fill="#fff8e7" stroke="#1a0030" strokeWidth="4" strokeLinejoin="round" />
      {/* mug */}
      <path d="M22 30 L26 86 q0 6 6 6 h36 q6 0 6 -6 L74 30 Z"
        fill="url(#beer-g)" stroke="#1a0030" strokeWidth="4" strokeLinejoin="round" />
      {/* handle */}
      <path d="M74 44 q14 0 14 14 q0 14 -14 14" fill="none" stroke="#1a0030" strokeWidth="5" />
      {/* highlight */}
      <rect x="30" y="38" width="4" height="38" rx="2" fill="#fff" opacity="0.4" />
      {/* bubbles */}
      <circle cx="56" cy="52" r="3" fill="#fff" opacity="0.55" />
      <circle cx="48" cy="66" r="2" fill="#fff" opacity="0.55" />
      <circle cx="60" cy="72" r="2.5" fill="#fff" opacity="0.55" />
    </svg>
  );
}

export function Kart(props: P) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <defs>
        <linearGradient id="kart-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6b8b" />
          <stop offset="100%" stopColor="#e60012" />
        </linearGradient>
      </defs>
      {/* body */}
      <path d="M12 64 q0 -16 18 -20 h40 q18 4 18 20 v6 q0 4 -4 4 H16 q-4 0 -4 -4 Z"
        fill="url(#kart-g)" stroke="#1a0030" strokeWidth="4" strokeLinejoin="round" />
      {/* driver helmet */}
      <circle cx="52" cy="38" r="14" fill="#ffcc00" stroke="#1a0030" strokeWidth="4" />
      <rect x="40" y="36" width="24" height="6" rx="2" fill="#1a0030" />
      {/* wheels */}
      <circle cx="26" cy="78" r="10" fill="#1a0030" />
      <circle cx="26" cy="78" r="4" fill="#777" />
      <circle cx="78" cy="78" r="10" fill="#1a0030" />
      <circle cx="78" cy="78" r="4" fill="#777" />
      {/* speed lines */}
      <path d="M4 50 h12 M2 60 h10 M6 70 h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
