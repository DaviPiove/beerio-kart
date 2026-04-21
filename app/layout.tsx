import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beerio Kart 🍺🏁",
  description: "Mario Kart tournament with a beer twist. Chug it within 3 laps. No joystick while drinking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
