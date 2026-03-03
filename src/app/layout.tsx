import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Haute Couture AI — Your Brutally Honest Fashion Stylist',
  description:
    'Real-time AI fashion critique powered by a brutally honest Hollywood stylist with 30+ years of experience. Present your outfit and get devastatingly accurate, expert-level feedback.',
  keywords: ['fashion', 'AI stylist', 'outfit critique', 'Gemini', 'real-time'],
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
