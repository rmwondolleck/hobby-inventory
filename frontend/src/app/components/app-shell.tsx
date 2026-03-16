import { Link, Outlet, useLocation } from "react-router";
import {
  Zap,
  Package,
  Archive,
  MapPin,
  Wrench,
  Upload,
  Printer,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { cn } from "./ui/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Intake", href: "/intake", icon: Zap },
  { name: "Parts", href: "/parts", icon: Package },
  { name: "Lots", href: "/lots", icon: Archive },
  { name: "Locations", href: "/locations", icon: MapPin },
  { name: "Projects", href: "/projects", icon: Wrench },
  { name: "Import", href: "/import", icon: Upload },
  { name: "Labels", href: "/print/labels", icon: Printer },
];

export function AppShell() {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background dark">
      {/* Left sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="font-semibold text-lg text-sidebar-foreground">
            Hobby Inventory
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Maker's Workshop
          </p>
        </div>

        {/* Global search */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search... (⌘K)"
              className="pl-9 bg-sidebar-accent"
              onFocus={() => setSearchOpen(true)}
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-sidebar-border text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>v1.0.0</span>
            <span>Dark Mode</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
