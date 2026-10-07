import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { Toaster } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "That Guy · I know a guy.",
  description: "Word of mouth, automated. Your guy asks your neighbors' guys.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff4e0" },
    { media: "(prefers-color-scheme: dark)", color: "#241f1b" },
  ],
};

// Applies the saved theme before paint so there's no flash. Cream paper by default.
const themeScript = `try{var t=localStorage.getItem('thatguy:theme');document.documentElement.classList.add(t==='dark'?'dark':'light')}catch(e){document.documentElement.classList.add('light')}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
