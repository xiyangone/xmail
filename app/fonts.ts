import localFont from "next/font/local";

export const jetBrainsMono = localFont({
  src: "../public/fonts/JetBrainsMonoNerdFont.ttf",
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});
