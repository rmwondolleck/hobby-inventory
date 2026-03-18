/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => {
  const MockLink = ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

import Home from '../page';

describe('Home page — theme class migration', () => {
  it('renders the welcome heading', () => {
    const { container } = render(<Home />);
    expect(container.querySelector('h1')?.textContent).toBe('Welcome to Hobby Inventory');
  });

  it('uses bg-background on the root element instead of bg-gray-50', () => {
    const { container } = render(<Home />);
    const main = container.querySelector('main');
    expect(main?.className).toContain('bg-background');
    expect(main?.className).not.toContain('bg-gray-50');
  });

  it('uses text-foreground on the h1 instead of text-gray-900', () => {
    const { container } = render(<Home />);
    const h1 = container.querySelector('h1');
    expect(h1?.className).toContain('text-foreground');
    expect(h1?.className).not.toContain('text-gray-900');
  });

  it('uses text-muted-foreground on the subtitle paragraph instead of text-gray-500', () => {
    const { container } = render(<Home />);
    const subtitleParagraph = container.querySelector('main > div > p');
    expect(subtitleParagraph?.className).toContain('text-muted-foreground');
    expect(subtitleParagraph?.className).not.toContain('text-gray-500');
  });

  it('uses bg-primary/10 and border-primary/20 on the Add to Inventory card instead of blue classes', () => {
    const { container } = render(<Home />);
    const intakeLink = container.querySelector('a[href="/intake"]');
    expect(intakeLink?.className).toContain('bg-primary/10');
    expect(intakeLink?.className).toContain('border-primary/20');
    expect(intakeLink?.className).not.toContain('bg-blue-50');
    expect(intakeLink?.className).not.toContain('border-blue-200');
  });

  it('uses text-primary on the Add to Inventory card heading instead of text-blue-800', () => {
    const { container } = render(<Home />);
    const intakeLink = container.querySelector('a[href="/intake"]');
    const heading = intakeLink?.querySelector('h2');
    expect(heading?.className).toContain('text-primary');
    expect(heading?.className).not.toContain('text-blue-800');
  });

  it('uses bg-card and border-border on dashboard nav cards instead of bg-white/border-gray-200', () => {
    const { container } = render(<Home />);
    const partsLink = container.querySelector('a[href="/parts"]');
    expect(partsLink?.className).toContain('bg-card');
    expect(partsLink?.className).toContain('border-border');
    expect(partsLink?.className).not.toContain('bg-white');
    expect(partsLink?.className).not.toContain('border-gray-200');
  });

  it('uses text-foreground on card headings instead of text-gray-800', () => {
    const { container } = render(<Home />);
    const partsHeading = container.querySelector('a[href="/parts"] h2');
    expect(partsHeading?.className).toContain('text-foreground');
    expect(partsHeading?.className).not.toContain('text-gray-800');
  });

  it('uses text-muted-foreground on card descriptions instead of text-gray-500', () => {
    const { container } = render(<Home />);
    const partsDesc = container.querySelector('a[href="/parts"] p');
    expect(partsDesc?.className).toContain('text-muted-foreground');
    expect(partsDesc?.className).not.toContain('text-gray-500');
  });

  it('renders all five navigation links', () => {
    render(<Home />);
    expect(screen.getByText('Add to Inventory')).toBeInTheDocument();
    expect(screen.getByText('Browse Parts')).toBeInTheDocument();
    expect(screen.getByText('Lots')).toBeInTheDocument();
    expect(screen.getByText('Locations')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });
});
