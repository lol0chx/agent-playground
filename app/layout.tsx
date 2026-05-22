import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Foundry Agent Playground',
    template: '%s — Foundry Agent Playground',
  },
  description:
    'A streaming-chat agent playground with tool calls and RAG. Built with Next.js, the Vercel AI SDK, Claude, and pgvector.',
  applicationName: 'Foundry Agent Playground',
  authors: [{ name: 'Henok Mekuria' }],
  keywords: [
    'agents',
    'Claude',
    'Vercel AI SDK',
    'RAG',
    'pgvector',
    'Microsoft Foundry',
    'streaming',
    'tool calling',
  ],
  openGraph: {
    title: 'Foundry Agent Playground',
    description:
      'Streaming Claude agent with tool calls and RAG over pgvector.',
    url: siteUrl,
    siteName: 'Foundry Agent Playground',
    images: [{ url: '/og.svg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Foundry Agent Playground',
    description:
      'Streaming Claude agent with tool calls and RAG over pgvector.',
    images: ['/og.svg'],
  },
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
