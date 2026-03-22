/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import PartsPage from '../page';

jest.mock('@/features/parts/components/PartsListClient', () => ({
  PartsListClient: () => <div data-testid="parts-list-client" />,
}));

describe('PartsPage', () => {
  it('renders without crashing', () => {
    render(<PartsPage />);
  });

  it('renders the page heading "Parts"', () => {
    render(<PartsPage />);
    expect(screen.getByRole('heading', { name: /^parts$/i })).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<PartsPage />);
    expect(screen.getByText(/browse and manage your parts catalog/i)).toBeInTheDocument();
  });

  it('renders the PartsListClient component', () => {
    render(<PartsPage />);
    expect(screen.getByTestId('parts-list-client')).toBeInTheDocument();
  });
});
