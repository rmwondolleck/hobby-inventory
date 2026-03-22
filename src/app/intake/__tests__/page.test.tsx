/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import IntakePage from '../page';

jest.mock('@/features/intake/components/IntakeForm', () => ({
  IntakeForm: () => <div data-testid="intake-form" />,
}));

describe('IntakePage', () => {
  it('renders without crashing', () => {
    render(<IntakePage />);
  });

  it('renders the page heading "Quick Add"', () => {
    render(<IntakePage />);
    expect(screen.getByRole('heading', { name: /quick add/i })).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<IntakePage />);
    expect(screen.getByText(/add parts and lots to your inventory/i)).toBeInTheDocument();
  });

  it('renders the IntakeForm component', () => {
    render(<IntakePage />);
    expect(screen.getByTestId('intake-form')).toBeInTheDocument();
  });
});
