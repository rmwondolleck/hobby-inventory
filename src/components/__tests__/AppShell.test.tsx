/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppShell } from '../AppShell';

// Mock next/navigation
const mockPathname = jest.fn(() => '/');
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn() }),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Zap: () => <svg data-testid="icon-zap" />,
  Package: () => <svg data-testid="icon-package" />,
  Archive: () => <svg data-testid="icon-archive" />,
  MapPin: () => <svg data-testid="icon-mappin" />,
  Wrench: () => <svg data-testid="icon-wrench" />,
  Upload: () => <svg data-testid="icon-upload" />,
  Printer: () => <svg data-testid="icon-printer" />,
  LayoutDashboard: () => <svg data-testid="icon-dashboard" />,
  Sun: () => <svg data-testid="icon-sun" />,
  Moon: () => <svg data-testid="icon-moon" />,
  Search: () => <svg data-testid="icon-search" />,
}));

// Mock @/components/ui/utils
jest.mock('@/components/ui/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock @/components/ui/input
jest.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

const mockSetTheme = jest.fn();
let mockResolvedTheme = 'light';

jest.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: mockResolvedTheme, setTheme: mockSetTheme }),
}));

describe('AppShell', () => {
  beforeEach(() => {
    mockResolvedTheme = 'light';
    mockSetTheme.mockClear();
    mockPathname.mockReturnValue('/');
  });

  it('renders children', () => {
    render(<AppShell><div data-testid="child">Content</div></AppShell>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders brand name and tagline', () => {
    render(<AppShell><div /></AppShell>);
    expect(screen.getByText('Hobby Inventory')).toBeInTheDocument();
    expect(screen.getByText("Maker's Workshop")).toBeInTheDocument();
  });

  it('renders version number', () => {
    render(<AppShell><div /></AppShell>);
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    render(<AppShell><div /></AppShell>);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Intake')).toBeInTheDocument();
    expect(screen.getByText('Parts')).toBeInTheDocument();
    expect(screen.getByText('Lots')).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  describe('theme toggle button', () => {
    it('is hidden before mount', () => {
      // Stub useEffect so setMounted(true) never fires → mounted stays false
      const useEffectSpy = jest.spyOn(React, 'useEffect').mockImplementation(() => {});
      const { container } = render(<AppShell><div /></AppShell>);
      expect(container.querySelector('button[aria-label="Toggle theme"]')).not.toBeInTheDocument();
      useEffectSpy.mockRestore();
    });

    it('shows Moon icon in light mode', () => {
      mockResolvedTheme = 'light';
      render(<AppShell><div /></AppShell>);
      expect(screen.getByTestId('icon-moon')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-sun')).not.toBeInTheDocument();
    });

    it('shows Sun icon in dark mode', () => {
      mockResolvedTheme = 'dark';
      render(<AppShell><div /></AppShell>);
      expect(screen.getByTestId('icon-sun')).toBeInTheDocument();
      expect(screen.queryByTestId('icon-moon')).not.toBeInTheDocument();
    });

    it('has accessible aria-label', () => {
      render(<AppShell><div /></AppShell>);
      const button = screen.getByRole('button', { name: 'Toggle theme' });
      expect(button).toBeInTheDocument();
    });

    it('has title "Switch to dark mode" in light mode', () => {
      mockResolvedTheme = 'light';
      render(<AppShell><div /></AppShell>);
      const button = screen.getByRole('button', { name: 'Toggle theme' });
      expect(button).toHaveAttribute('title', 'Switch to dark mode');
    });

    it('has title "Switch to light mode" in dark mode', () => {
      mockResolvedTheme = 'dark';
      render(<AppShell><div /></AppShell>);
      const button = screen.getByRole('button', { name: 'Toggle theme' });
      expect(button).toHaveAttribute('title', 'Switch to light mode');
    });

    it('calls setTheme with "dark" when clicked in light mode', () => {
      mockResolvedTheme = 'light';
      render(<AppShell><div /></AppShell>);
      fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('calls setTheme with "light" when clicked in dark mode', () => {
      mockResolvedTheme = 'dark';
      render(<AppShell><div /></AppShell>);
      fireEvent.click(screen.getByRole('button', { name: 'Toggle theme' }));
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('navigation link hrefs', () => {
    const expectedRoutes = [
      { name: 'Dashboard', href: '/' },
      { name: 'Intake', href: '/intake' },
      { name: 'Parts', href: '/parts' },
      { name: 'Lots', href: '/lots' },
      { name: 'Locations', href: '/locations' },
      { name: 'Projects', href: '/projects' },
      { name: 'Import', href: '/import' },
    ];

    it('renders exactly 7 navigation links', () => {
      render(<AppShell><div /></AppShell>);
      const navLinks = screen.getAllByRole('link').filter(
        (link) => expectedRoutes.some((r) => r.name === link.textContent?.trim())
      );
      expect(navLinks).toHaveLength(7);
    });

    expectedRoutes.forEach(({ name, href }) => {
      it(`"${name}" link points to "${href}"`, () => {
        render(<AppShell><div /></AppShell>);
        const link = screen.getByText(name).closest('a');
        expect(link).toHaveAttribute('href', href);
      });
    });
  });

  describe('navigation active state', () => {
    it('marks Dashboard as active when pathname is "/"', () => {
      mockPathname.mockReturnValue('/');
      render(<AppShell><div /></AppShell>);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).toContain('bg-sidebar-primary');
    });

    it('marks Parts as active when pathname starts with "/parts"', () => {
      mockPathname.mockReturnValue('/parts');
      render(<AppShell><div /></AppShell>);
      const partsLink = screen.getByText('Parts').closest('a');
      expect(partsLink?.className).toContain('bg-sidebar-primary');
    });

    it('does not mark Dashboard as active when on /parts', () => {
      mockPathname.mockReturnValue('/parts');
      render(<AppShell><div /></AppShell>);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).not.toContain('bg-sidebar-primary');
    });

    const nonDashboardRoutes = [
      { name: 'Intake', href: '/intake' },
      { name: 'Lots', href: '/lots' },
      { name: 'Locations', href: '/locations' },
      { name: 'Projects', href: '/projects' },
      { name: 'Import', href: '/import' },
    ];

    nonDashboardRoutes.forEach(({ name, href }) => {
      it(`marks ${name} as active when pathname is "${href}"`, () => {
        mockPathname.mockReturnValue(href);
        render(<AppShell><div /></AppShell>);
        const link = screen.getByText(name).closest('a');
        expect(link?.className).toContain('bg-sidebar-primary');
      });

      it(`marks ${name} as active on deep path "${href}/123"`, () => {
        mockPathname.mockReturnValue(`${href}/123`);
        render(<AppShell><div /></AppShell>);
        const link = screen.getByText(name).closest('a');
        expect(link?.className).toContain('bg-sidebar-primary');
      });
    });

    it('does not mark Dashboard as active on any non-root path', () => {
      mockPathname.mockReturnValue('/intake');
      render(<AppShell><div /></AppShell>);
      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink?.className).not.toContain('bg-sidebar-primary');
    });

    it('marks only one nav item as active at a time', () => {
      mockPathname.mockReturnValue('/locations');
      render(<AppShell><div /></AppShell>);
      const activeLinks = screen
        .getAllByRole('link')
        .filter((link) => link.className.includes('bg-sidebar-primary'));
      expect(activeLinks).toHaveLength(1);
      expect(activeLinks[0].textContent?.trim()).toBe('Locations');
    });
  });
});
