import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DayShip Studio',
  description: 'Convert Figma designs and URLs into clean, production-ready code.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
