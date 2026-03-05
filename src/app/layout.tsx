import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NUM Print - Код Хэвлэх Систем",
  description: "Програмчлалын тэмцээний код хэвлэх систем",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
