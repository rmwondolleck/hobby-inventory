'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Zap,
  Package,
  Archive,
  MapPin,
  Wrench,
  Upload,
  LayoutDashboard,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/components/ui/utils';
import { CommandPalette } from '@/components/CommandPalette';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import BottomTabBar from '@/components/BottomTabBar';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Intake', href: '/intake', icon: Zap },
  { name: 'Parts', href: '/parts', icon: Package },
  { name: 'Lots', href: '/lots', icon: Archive },
  { name: 'Locations', href: '/locations', icon: MapPin },
  { name: 'Projects', href: '/projects', icon: Wrench },
  { name: 'Import', href: '/import', icon: Upload },
];

// Routes for vim-style g+(key) navigation
const gNavRoutes: Record<string, string> = {
  i: '/intake',
  p: '/parts',
  l: '/lots',
  j: '/projects',
  m: '/locations',
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const gChordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingGRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // cmd+K / ctrl+K — open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(v => !v);
        return;
      }

      // Suppress single-key shortcuts when focus is inside an editable element
      const active = document.activeElement;
      const tag = active?.tagName.toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        (active as HTMLElement | null)?.isContentEditable;
      if (isEditable) return;

      // ? — toggle keyboard shortcuts modal
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen(v => !v);
        return;
      }

      // Escape — close shortcuts modal (Dialog handles this natively, but guard here too)
      if (e.key === 'Escape') {
        setShortcutsModalOpen(false);
        return;
      }

      // vim-style g+(key) navigation
      if (awaitingGRef.current) {
        // We're in the second key of a g-chord
        awaitingGRef.current = false;
        if (gChordTimeoutRef.current !== null) {
          clearTimeout(gChordTimeoutRef.current);
          gChordTimeoutRef.current = null;
        }
        const route = gNavRoutes[e.key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        return;
      }

      if (e.key === 'g') {
        e.preventDefault();
        awaitingGRef.current = true;
        gChordTimeoutRef.current = setTimeout(() => {
          awaitingGRef.current = false;
          gChordTimeoutRef.current = null;
        }, 300);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (gChordTimeoutRef.current !== null) {
        clearTimeout(gChordTimeoutRef.current);
      }
    };
  }, [router]);

  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-sidebar shrink-0">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-semibold text-lg text-sidebar-foreground">
            Hobby Inventory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Maker&apos;s Workshop</p>
        </div>

        {/* Global search trigger */}
        <div className="p-4 border-b border-sidebar-border">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent px-3 py-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            <Search className="size-4 shrink-0" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-xs sm:inline-block">
              ⌘K
            </kbd>
          </button>
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
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="rounded-md p-1.5 hover:bg-sidebar-accent transition-colors"
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>

      <BottomTabBar />

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      <KeyboardShortcutsModal open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen} />
    </div>
  );
}
