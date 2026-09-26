import type { Metadata, Viewport } from 'next';
import { Secular_One, Varela_Round } from 'next/font/google';
import './globals.css';

const display = Secular_One({ weight: '400', subsets: ['hebrew', 'latin'], variable: '--font-display' });
const body = Varela_Round({ weight: '400', subsets: ['hebrew', 'latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'כספיון',
  description: 'משחק שלבים וסיפור מוקרא לילדים, בהשראת "כספיון הדג הקטן".',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1f74c0',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
