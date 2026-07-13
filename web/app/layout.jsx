import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "Dispango — AI receptionist for home & trade services",
  description:
    "Dispango answers every call, captures the job, and texts you the lead in seconds — 24/7, even when you're on the tools. Flat $199/mo. Keep your number.",
  metadataBase: new URL("https://dispango.com"),
  openGraph: {
    title: "Dispango — AI receptionist for trades",
    description:
      "Answers every call, captures the job, texts you the lead in seconds — 24/7.",
    url: "https://dispango.com",
    siteName: "Dispango",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#5b5bf5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.className}>
      <body>{children}</body>
    </html>
  );
}
