import type { Metadata, Viewport } from "next";
import { Kalam, Mukta, Yatra_One } from "next/font/google";
import "./globals.css";

const yatra = Yatra_One({ weight: "400", subsets: ["latin"], variable: "--font-yatra" });
const kalam = Kalam({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-kalam" });
const mukta = Mukta({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-mukta" });

export const metadata: Metadata = {
  title: {
    default: "Moksha Patam: your habits as Snakes and Ladders",
    template: "%s · Moksha Patam",
  },
  description:
    "A habit tracker played as the original Indian Snakes and Ladders. Good habits are ladders, bad habits are snakes. Reach Moksha in 30 days.",
  applicationName: "Moksha Patam",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5e6c8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${yatra.variable} ${kalam.variable} ${mukta.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
