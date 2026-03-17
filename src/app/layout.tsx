import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { AppShell } from '@/components/AppShell';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'Hobby Inventory',
  description: 'Manage your hobby parts and components',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
