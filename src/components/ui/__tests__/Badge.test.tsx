/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '../Badge';

// Mock the cn utility to avoid tailwind-merge complications in tests
jest.mock('@/lib/utils', () => ({
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
    expect(span.className).toContain('bg-blue-100');
    expect(span.className).toContain('text-blue-800');
  });

  it('applies secondary variant styles', () => {
    const { container } = render(<Badge variant="secondary">secondary</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('bg-gray-100');
    expect(span.className).toContain('text-gray-700');
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

  it('merges custom className with variant classes', () => {
    const { container } = render(<Badge className="custom-class">test</Badge>);
    const span = container.firstChild as HTMLElement;
    expect(span.className).toContain('custom-class');
    expect(span.className).toContain('bg-blue-100');
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
