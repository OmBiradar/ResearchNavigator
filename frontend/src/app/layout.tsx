import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Research Navigator',
  description: 'A powerful research tool using structured LLM pipelines and logical control',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">{children}</body>
    </html>
  );
}
