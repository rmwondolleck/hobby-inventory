/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/features/intake/components/IntakeForm', () => ({
  IntakeForm: () => <div data-testid="intake-form" />,
}));

import IntakePage from '../intake/page';

describe('Intake page — theme class migration', () => {
  it('renders the Quick Add heading', () => {
    render(<IntakePage />);
    expect(screen.getByRole('heading', { name: 'Quick Add' })).toBeInTheDocument();
  });

  it('uses bg-background on root element instead of bg-gray-50', () => {
    const { container } = render(<IntakePage />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-background');
    expect(root.className).not.toContain('bg-gray-50');
  });

  it('uses text-foreground on h1 instead of text-gray-900', () => {
    const { container } = render(<IntakePage />);
    const h1 = container.querySelector('h1');
    expect(h1?.className).toContain('text-foreground');
    expect(h1?.className).not.toContain('text-gray-900');
  });

  it('uses text-muted-foreground on subtitle instead of text-gray-500', () => {
    const { container } = render(<IntakePage />);
    const subtitle = container.querySelector('h1 + p');
    expect(subtitle?.className).toContain('text-muted-foreground');
    expect(subtitle?.className).not.toContain('text-gray-500');
  });

  it('uses bg-card and border-border on the form card instead of bg-white/border-gray-200', () => {
    const { container } = render(<IntakePage />);
    const formCard = container.querySelector('[data-testid="intake-form"]')?.parentElement;
    expect(formCard?.className).toContain('bg-card');
    expect(formCard?.className).toContain('border-border');
    expect(formCard?.className).not.toContain('bg-white');
    expect(formCard?.className).not.toContain('border-gray-200');
  });

  it('renders the IntakeForm component', () => {
    render(<IntakePage />);
    expect(screen.getByTestId('intake-form')).toBeInTheDocument();
  });
});
