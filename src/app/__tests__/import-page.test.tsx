/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/features/import/components/ImportForm', () => ({
  ImportForm: () => <div data-testid="import-form" />,
}));

import ImportPage from '../import/page';

describe('Import page — theme class migration', () => {
  it('renders the CSV Import heading', () => {
    render(<ImportPage />);
    expect(screen.getByRole('heading', { name: 'CSV Import' })).toBeInTheDocument();
  });

  it('uses bg-background on root element instead of bg-gray-50', () => {
    const { container } = render(<ImportPage />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-background');
    expect(root.className).not.toContain('bg-gray-50');
  });

  it('uses text-foreground on h1 instead of text-gray-900', () => {
    const { container } = render(<ImportPage />);
    const h1 = container.querySelector('h1');
    expect(h1?.className).toContain('text-foreground');
    expect(h1?.className).not.toContain('text-gray-900');
  });

  it('uses text-muted-foreground on subtitle instead of text-gray-500', () => {
    const { container } = render(<ImportPage />);
    const subtitle = container.querySelector('h1 + p');
    expect(subtitle?.className).toContain('text-muted-foreground');
    expect(subtitle?.className).not.toContain('text-gray-500');
  });

  it('uses bg-card and border-border on the form card instead of bg-white/border-gray-200', () => {
    const { container } = render(<ImportPage />);
    const formCard = container.querySelector('[data-testid="import-form"]')?.parentElement;
    expect(formCard?.className).toContain('bg-card');
    expect(formCard?.className).toContain('border-border');
    expect(formCard?.className).not.toContain('bg-white');
    expect(formCard?.className).not.toContain('border-gray-200');
  });

  it('preserves the amber warning banner with its semantic color classes', () => {
    const { container } = render(<ImportPage />);
    const amberBanner = container.querySelector('.border-amber-200');
    expect(amberBanner).not.toBeNull();
    expect(amberBanner?.className).toContain('bg-amber-50');
    expect(amberBanner?.className).toContain('text-amber-800');
  });

  it('renders the ImportForm component', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-form')).toBeInTheDocument();
  });
});
