/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import BottomTabBar from '../BottomTabBar';

const mockPathname = jest.fn(() => '/');

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
    className,
    'aria-label': ariaLabel,
    'aria-current': ariaCurrent,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
    'aria-label'?: string;
    'aria-current'?: string;
  }) => (
    <a href={href} className={className} aria-label={ariaLabel} aria-current={ariaCurrent}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('lucide-react', () => ({
  Home: () => <svg data-testid="icon-home" />,
  Zap: () => <svg data-testid="icon-zap" />,
  Package: () => <svg data-testid="icon-package" />,
  Layers: () => <svg data-testid="icon-layers" />,
  Wrench: () => <svg data-testid="icon-wrench" />,
}));

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/intake', label: 'Intake' },
  { href: '/parts', label: 'Parts' },
  { href: '/lots', label: 'Lots' },
  { href: '/projects', label: 'Projects' },
];

describe('BottomTabBar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/');
  });

  describe('rendering', () => {
    it('renders a nav element', () => {
      render(<BottomTabBar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders all 5 nav tabs', () => {
      render(<BottomTabBar />);
      expect(screen.getAllByRole('link')).toHaveLength(5);
    });

    it('renders Dashboard tab', () => {
      render(<BottomTabBar />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('renders Intake tab', () => {
      render(<BottomTabBar />);
      expect(screen.getByText('Intake')).toBeInTheDocument();
    });

    it('renders Parts tab', () => {
      render(<BottomTabBar />);
      expect(screen.getByText('Parts')).toBeInTheDocument();
    });

    it('renders Lots tab', () => {
      render(<BottomTabBar />);
      expect(screen.getByText('Lots')).toBeInTheDocument();
    });

    it('renders Projects tab', () => {
      render(<BottomTabBar />);
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('renders icons for all tabs', () => {
      render(<BottomTabBar />);
      expect(screen.getByTestId('icon-home')).toBeInTheDocument();
      expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
      expect(screen.getByTestId('icon-package')).toBeInTheDocument();
      expect(screen.getByTestId('icon-layers')).toBeInTheDocument();
      expect(screen.getByTestId('icon-wrench')).toBeInTheDocument();
    });

    it('nav has fixed bottom positioning classes', () => {
      render(<BottomTabBar />);
      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('fixed');
      expect(nav.className).toContain('bottom-0');
    });

    it('nav is hidden on md+ screens', () => {
      render(<BottomTabBar />);
      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('md:hidden');
    });

    it('applies safe-area-inset-bottom padding style', () => {
      render(<BottomTabBar />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveStyle({ paddingBottom: 'env(safe-area-inset-bottom)' });
    });

    it('nav has z-50 class for correct stacking', () => {
      render(<BottomTabBar />);
      const nav = screen.getByRole('navigation');
      expect(nav.className).toContain('z-50');
    });
  });

  describe('link hrefs', () => {
    NAV_ITEMS.forEach(({ href, label }) => {
      it(`"${label}" tab links to "${href}"`, () => {
        render(<BottomTabBar />);
        const link = screen.getByText(label).closest('a');
        expect(link).toHaveAttribute('href', href);
      });
    });
  });

  describe('accessibility', () => {
    NAV_ITEMS.forEach(({ label }) => {
      it(`"${label}" tab has aria-label="${label}"`, () => {
        render(<BottomTabBar />);
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      });
    });

    it('active tab has aria-current="page"', () => {
      mockPathname.mockReturnValue('/');
      render(<BottomTabBar />);
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });

    it('inactive tabs do not have aria-current', () => {
      mockPathname.mockReturnValue('/');
      render(<BottomTabBar />);
      const partsLink = screen.getByLabelText('Parts');
      expect(partsLink).not.toHaveAttribute('aria-current');
    });
  });

  describe('active state highlighting', () => {
    it('marks Dashboard as active on "/"', () => {
      mockPathname.mockReturnValue('/');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Dashboard');
      expect(link.className).toContain('text-foreground');
    });

    it('marks Dashboard as inactive on non-root path', () => {
      mockPathname.mockReturnValue('/parts');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Dashboard');
      expect(link.className).toContain('text-muted-foreground');
      expect(link.className).not.toContain('text-foreground');
    });

    it('marks Parts as active when pathname is "/parts"', () => {
      mockPathname.mockReturnValue('/parts');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Parts');
      expect(link.className).toContain('text-foreground');
    });

    it('marks Parts as active on deep path "/parts/123"', () => {
      mockPathname.mockReturnValue('/parts/123');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Parts');
      expect(link.className).toContain('text-foreground');
    });

    it('marks Lots as active when pathname is "/lots"', () => {
      mockPathname.mockReturnValue('/lots');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Lots');
      expect(link.className).toContain('text-foreground');
    });

    it('marks Intake as active when pathname is "/intake"', () => {
      mockPathname.mockReturnValue('/intake');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Intake');
      expect(link.className).toContain('text-foreground');
    });

    it('marks Projects as active when pathname is "/projects"', () => {
      mockPathname.mockReturnValue('/projects');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Projects');
      expect(link.className).toContain('text-foreground');
    });

    it('marks Projects as active on deep path "/projects/42"', () => {
      mockPathname.mockReturnValue('/projects/42');
      render(<BottomTabBar />);
      const link = screen.getByLabelText('Projects');
      expect(link.className).toContain('text-foreground');
    });

    it('marks only one tab as active at a time', () => {
      mockPathname.mockReturnValue('/parts');
      render(<BottomTabBar />);
      const activeLinks = screen.getAllByRole('link').filter(
        (link) => link.getAttribute('aria-current') === 'page'
      );
      expect(activeLinks).toHaveLength(1);
    });

    it('inactive tabs use text-muted-foreground', () => {
      mockPathname.mockReturnValue('/parts');
      render(<BottomTabBar />);
      const inactiveLinks = screen.getAllByRole('link').filter(
        (link) => link.getAttribute('aria-current') !== 'page'
      );
      inactiveLinks.forEach((link) => {
        expect(link.className).toContain('text-muted-foreground');
      });
    });

    it('does not mark Dashboard as active via startsWith when on /parts', () => {
      mockPathname.mockReturnValue('/parts');
      render(<BottomTabBar />);
      const dashboardLink = screen.getByLabelText('Dashboard');
      expect(dashboardLink).not.toHaveAttribute('aria-current', 'page');
    });
  });
});
