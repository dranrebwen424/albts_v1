import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'ALBTS - Departmental Liquidation & Financial Reporting',
  description: 'Departmental Liquidation & Financial Reporting System',
};

export const viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-bg-app text-text-primary">{children}</body>
    </html>
  );
}
