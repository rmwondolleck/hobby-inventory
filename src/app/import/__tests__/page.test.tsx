/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import ImportPage from '../page';

jest.mock('@/features/import/components/ImportForm', () => ({
  ImportForm: () => <div data-testid="import-form" />,
}));

describe('ImportPage', () => {
  it('renders without crashing', () => {
    render(<ImportPage />);
  });

  it('renders the page heading "CSV Import"', () => {
    render(<ImportPage />);
    expect(screen.getByRole('heading', { name: /csv import/i })).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<ImportPage />);
    expect(screen.getByText(/bulk-import locations, parts, and lots/i)).toBeInTheDocument();
  });

  it('renders the recommended import order notice', () => {
    render(<ImportPage />);
    expect(screen.getByText(/recommended order/i)).toBeInTheDocument();
  });

  it('renders the ImportForm component', () => {
    render(<ImportPage />);
    expect(screen.getByTestId('import-form')).toBeInTheDocument();
  });
});
