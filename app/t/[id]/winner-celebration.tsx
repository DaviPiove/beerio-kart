"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

export function WinnerCelebration() {
  useEffect(() => {
    const colors = ["#ffcc00", "#ff4d94", "#2ecc71", "#1fb4ff", "#9c27ff", "#e60012"];
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        origin: { x: 1 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    // Big star burst in the middle.
    confetti({
      particleCount: 160,
      spread: 120,
      startVelocity: 45,
      shapes: ["star", "circle"],
      colors,
      origin: { y: 0.4 },
    });
  }, []);
  return null;
}
