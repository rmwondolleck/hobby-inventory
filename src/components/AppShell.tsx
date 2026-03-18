'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Zap,
  Package,
  Archive,
  MapPin,
  Wrench,
  Upload,
  Printer,
  LayoutDashboard,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/components/ui/utils';
import { Input } from '@/components/ui/input';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Intake', href: '/intake', icon: Zap },
  { name: 'Parts', href: '/parts', icon: Package },
  { name: 'Lots', href: '/lots', icon: Archive },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Projects', href: '/projects', icon: Wrench },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Labels', href: '/print/labels', icon: Printer },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-semibold text-lg text-sidebar-foreground">
            Hobby Inventory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Maker&apos;s Workshop</p>
        </div>

        {/* Global search */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search... (⌘K)"
              className="pl-9 bg-sidebar-accent"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="size-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground flex items-center justify-between">
          <span>v1.0.0</span>
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
