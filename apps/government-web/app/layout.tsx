import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SurakshaNet Government Web",
  description: "Government monitoring dashboard starter"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
