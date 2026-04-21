import type { Metadata } from "next";
import { Bungee, Fredoka, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { AnimatedBackground } from "@/components/background";

const bungee = Bungee({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const pixel = Press_Start_2P({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "Beerio Kart 🍺🏁",
  description:
    "Mario Kart tournament with a beer twist. Chug within 3 laps. No joystick while drinking.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${bungee.variable} ${fredoka.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative overflow-x-hidden">
        <AnimatedBackground />
        <div className="relative z-10 flex flex-col flex-1">{children}</div>
      </body>
    </html>
  );
}
