import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Podium — Live Leaderboards",
  description: "Host beautiful, live, editable leaderboards. Casino, affiliate, streamer, esports and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
