import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";

// Root layout: stays mounted when the locale changes, so the theme script is never re-rendered on the client.

// Hind Siliguri covers Latin and Bengali glyphs in one self-hosted family.
const hindSiliguri = localFont({
  variable: "--font-hind-siliguri",
  display: "swap",
  fallback: ["Noto Sans Bengali", "system-ui", "sans-serif"],
  src: [
    { path: "./fonts/HindSiliguri-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/HindSiliguri-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/HindSiliguri-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/HindSiliguri-SemiBold.woff2", weight: "600", style: "normal" },
    { path: "./fonts/HindSiliguri-Bold.woff2", weight: "700", style: "normal" },
  ],
});

// Runs before first paint so the saved or system theme applies without a flash.
const themeScript = `(function(){try{var s=localStorage.getItem('theme');var dark=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',dark);r.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${hindSiliguri.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
