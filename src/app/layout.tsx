import type { Metadata } from "next";
import "./globals.css";
import { SoundControl } from "@/components/audio/sound-control";

export const metadata: Metadata = {
  title: "REDLINE",
  description:
    "A multiplayer AI crisis simulation where nobody has the whole truth.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<SoundControl/></body>
    </html>
  );
}
