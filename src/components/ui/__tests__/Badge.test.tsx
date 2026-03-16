/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '../badge';

// Mock the cn utility (badge uses relative ./utils, not @/lib/utils)
jest.mock('../utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(' '),
}));

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>passive</Badge>);
    expect(screen.getByText('passive')).toBeInTheDocument();
  });

  it('renders as a span element', () => {
    const { container } = render(<Badge>test</Badge>);
    expect(container.firstChild?.nodeName).toBe('SPAN');
  });

  it('applies default variant styles when no variant is specified', () => {
    const { container } = render(<Badge>default</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-primary');
    expect(span.className).toContain('text-primary-foreground');
  });

  it('applies secondary variant styles', () => {
    const { container } = render(<Badge variant="secondary">secondary</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-secondary');
    expect(span.className).toContain('text-secondary-foreground');
  });

  it('applies success variant styles', () => {
    const { container } = render(<Badge variant="success">in stock</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-green-100');
    expect(span.className).toContain('text-green-800');
  });

  it('applies warning variant styles', () => {
    const { container } = render(<Badge variant="warning">low</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-yellow-100');
    expect(span.className).toContain('text-yellow-800');
  });

  it('applies danger variant styles', () => {
    const { container } = render(<Badge variant="danger">out</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-red-100');
    expect(span.className).toContain('text-red-800');
  });

  it('applies destructive variant styles', () => {
    const { container } = render(<Badge variant="destructive">error</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-destructive');
  });

  it('applies outline variant styles', () => {
    const { container } = render(<Badge variant="outline">outline</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('text-foreground');
  });

  it('merges custom className with variant classes', () => {
    const { container } = render(<Badge className="custom-class">test</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('custom-class');
    expect(span.className).toContain('bg-primary');
  });

  it('renders react node children (not just strings)', () => {
    render(
      <Badge>
        <strong>bold</strong>
      </Badge>
    );
    expect(screen.getByText('bold')).toBeInTheDocument();
  });
});
