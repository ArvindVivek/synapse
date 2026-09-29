import type { Metadata, Viewport } from "next";
import { KLProviders } from "@/components/kl";
import { fontVariables } from "@/lib/kl/fonts";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name}: draft practice for League of Legends`, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { type: "website", siteName: site.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Matches --bg, so the browser chrome never flashes another colour.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: site.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: site.themeColor.dark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes writes data-theme on <html> before React hydrates.
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body className="min-h-dvh bg-bg font-body text-ink antialiased">
        <KLProviders>{children}</KLProviders>
      </body>
    </html>
  );
}
