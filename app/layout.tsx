import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QueryCraft — Visual Query Builder',
  description: 'Build complex database queries visually with unlimited nesting, live SQL preview, and multi-schema support.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
