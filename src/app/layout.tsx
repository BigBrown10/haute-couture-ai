import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zaute AI — Your Brutally Honest 3D Fashion Designer',
  description:
    'Real-time AI fashion critique and 3D design powered by Zaute. Present your outfit and get expert-level feedback or collaborate on high-fidelity sketches.',
  keywords: ['fashion', 'AI designer', '3D character', 'Zaute', 'real-time'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
