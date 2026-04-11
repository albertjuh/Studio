import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import QueryProvider from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'PartoMa Project Cohort',
  description: 'A data management platform for an Antenatal Care (ANC) cohort study.',
  applicationName: 'PartoMa Project Cohort',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PartoMa Project Cohort',
  },
  manifest: '/manifest.json',
  icons: {
    apple: 'https://picsum.photos/seed/partoma-clinical/180/180',
    icon: 'https://picsum.photos/seed/partoma-clinical/192/192',
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="sw-register" strategy="afterInteractive">{
          `if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
              .then(r => console.log('SW ready:', r.scope))
              .catch(e => console.error('SW failed:', e));
          }`
        }</Script>
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <FirebaseClientProvider>
              {children}
            </FirebaseClientProvider>
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
