"use client";

import { useMemo } from "react";
import { Banana, Bolt, Coin, GreenShell, Mushroom, RedShell, Star } from "./assets";

const ITEMS = [Banana, GreenShell, RedShell, Star, Mushroom, Bolt, Coin];

// Deterministic pseudo-random so SSR and CSR match.
function seed(i: number) {
  const x = Math.sin(i * 9299.3) * 43758.5453;
  return x - Math.floor(x);
}

export function AnimatedBackground() {
  const floats = useMemo(() => {
    return Array.from({ length: 9 }, (_, i) => {
      const Cmp = ITEMS[i % ITEMS.length];
      const size = 40 + Math.floor(seed(i) * 56); // 40..96
      const top = Math.floor(seed(i + 11) * 90);
      const delay = -Math.floor(seed(i + 22) * 18);
      const duration = 16 + Math.floor(seed(i + 33) * 14);
      return { Cmp, size, top, delay, duration, key: i };
    });
  }, []);

  return (
    <>
      <div className="bg-sky" aria-hidden />
      <div className="bg-rainbow-road" aria-hidden />
      <div className="bg-grid" aria-hidden />
      <div className="bg-scanlines" aria-hidden />
      {floats.map(({ Cmp, size, top, delay, duration, key }) => (
        <div
          key={key}
          className="float-item"
          aria-hidden
          style={{
            width: size,
            height: size,
            top: `${top}%`,
            animationDuration: `${duration}s, 5s`,
            animationDelay: `${delay}s, 0s`,
          }}
        >
          <Cmp />
        </div>
      ))}
    </>
  );
}
