import "./globals.css";

export const metadata = {
  title: "Dispango — AI receptionist & dispatch for locksmiths",
  description:
    "Dispango answers every call, captures the job, and texts the lead straight to your phone — 24/7, even when you're on a job. A flat $199/mo. Keep your own number.",
  metadataBase: new URL("https://dispango.com"),
  openGraph: {
    title: "Dispango — AI receptionist for locksmiths",
    description:
      "Answers every call, captures the job, texts you the lead in seconds — 24/7.",
    url: "https://dispango.com",
    siteName: "Dispango",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#2f6bed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
