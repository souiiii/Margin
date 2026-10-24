import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Margin — your English, a little more yours",
  description:
    "A personal English learning space. Read, collect, practise, remember.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
