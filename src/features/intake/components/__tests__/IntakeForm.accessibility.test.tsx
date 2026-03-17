/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntakeForm } from '../IntakeForm';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock subcomponents that have their own fetch/side-effects
jest.mock('../PartSearch', () => ({
  PartSearch: () => <div data-testid="part-search" />,
}));

jest.mock('../LocationPicker', () => ({
  LocationPicker: () => <div data-testid="location-picker" />,
}));

// Stub fetch so the useEffect category-load doesn't throw
beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    json: () => Promise.resolve({ data: [], defaults: [] }),
  }) as jest.Mock;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('IntakeForm – label/input accessibility associations', () => {
  describe('part form fields (new-part mode, the default)', () => {
    it('associates "Name" label with the part-name input', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/^name/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'part-name');
    });

    it('associates "Category" label with the part-category input', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/^category$/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'part-category');
    });

    it('associates "Manufacturer" label with the part-manufacturer input', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/^manufacturer$/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'part-manufacturer');
    });

    it('associates "MPN" label with the part-mpn input', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/^mpn$/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'part-mpn');
    });

    it('associates "Notes" label with the part-notes textarea (part section)', () => {
      render(<IntakeForm />);
      // There are two "Notes" labels (part + lot); getByLabelText will match the
      // first one whose htmlFor resolves to an existing element.
      const textarea = document.getElementById('part-notes');
      expect(textarea).toBeInTheDocument();
      expect(textarea!.tagName.toLowerCase()).toBe('textarea');
      const label = document.querySelector('label[for="part-notes"]');
      expect(label).toBeInTheDocument();
    });
  });

  describe('lot form fields', () => {
    it('associates "Quantity" label with the lot-quantity input (exact mode default)', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/^quantity$/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'lot-quantity');
    });

    it('associates "Unit" label with the lot-unit input', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/^unit$/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'lot-unit');
    });

    it('associates "Source URL" label with the lot-source-url input', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/source url/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'lot-source-url');
    });

    it('associates "Received date" label with the lot-received-at input', () => {
      render(<IntakeForm />);
      const input = screen.getByLabelText(/received date/i);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'lot-received-at');
    });

    it('associates "Lot notes" label with the lot-notes textarea (non-quick-restock mode)', () => {
      render(<IntakeForm />);
      const textarea = document.getElementById('lot-notes');
      expect(textarea).toBeInTheDocument();
      expect(textarea!.tagName.toLowerCase()).toBe('textarea');
      const label = document.querySelector('label[for="lot-notes"]');
      expect(label).toBeInTheDocument();
    });

    it('hides lot-notes when quick-restock mode is active', () => {
      render(<IntakeForm />);
      fireEvent.click(screen.getByRole('button', { name: /quick restock/i }));
      expect(document.getElementById('lot-notes')).not.toBeInTheDocument();
    });
  });

  describe('id uniqueness', () => {
    it('each form field id appears exactly once in the document', () => {
      render(<IntakeForm />);
      const ids = [
        'part-name',
        'part-category',
        'part-manufacturer',
        'part-mpn',
        'part-notes',
        'lot-quantity',
        'lot-unit',
        'lot-source-url',
        'lot-received-at',
        'lot-notes',
      ];
      for (const id of ids) {
        const elements = document.querySelectorAll(`#${id}`);
        expect(elements).toHaveLength(1);
      }
    });
  });
});
