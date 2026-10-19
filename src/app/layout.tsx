import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elder Realms Online",
  description: "An original browser-based 3D open-world MMORPG.",
  applicationName: "Elder Realms Online",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Elder Realms" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101713",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
