'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, Package, Layers, Wrench } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/',         label: 'Dashboard', icon: Home },
  { href: '/intake',   label: 'Intake',    icon: Zap },
  { href: '/parts',    label: 'Parts',     icon: Package },
  { href: '/lots',     label: 'Lots',      icon: Layers },
  { href: '/projects', label: 'Projects',  icon: Wrench },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t border-border bg-background"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || (href !== '/' && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-xs ${
              isActive ? 'text-foreground' : 'text-muted-foreground'
            }`}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
