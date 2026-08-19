import localFont from "next/font/local";

export const jetBrainsMono = localFont({
  src: "../public/fonts/JetBrainsMono-Regular.ttf",
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});
