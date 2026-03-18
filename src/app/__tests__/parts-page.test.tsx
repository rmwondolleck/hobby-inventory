/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/features/parts/components/PartsListClient', () => ({
  PartsListClient: () => <div data-testid="parts-list-client" />,
}));

import PartsPage from '../parts/page';

describe('Parts page — theme class migration', () => {
  it('renders the Parts heading', () => {
    render(<PartsPage />);
    expect(screen.getByRole('heading', { name: 'Parts' })).toBeInTheDocument();
  });

  it('uses bg-background on root element instead of bg-gray-50', () => {
    const { container } = render(<PartsPage />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-background');
    expect(root.className).not.toContain('bg-gray-50');
  });

  it('uses text-foreground on h1 instead of text-gray-900', () => {
    const { container } = render(<PartsPage />);
    const h1 = container.querySelector('h1');
    expect(h1?.className).toContain('text-foreground');
    expect(h1?.className).not.toContain('text-gray-900');
  });

  it('uses text-muted-foreground on subtitle instead of text-gray-500', () => {
    const { container } = render(<PartsPage />);
    const subtitle = container.querySelector('h1 + p');
    expect(subtitle?.className).toContain('text-muted-foreground');
    expect(subtitle?.className).not.toContain('text-gray-500');
  });

  it('renders the PartsListClient component', () => {
    render(<PartsPage />);
    expect(screen.getByTestId('parts-list-client')).toBeInTheDocument();
  });
});
