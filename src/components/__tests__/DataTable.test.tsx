/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../DataTable';

// Mock lucide-react icons used by DataTable
jest.mock('lucide-react', () => ({
  ChevronLeft: () => <svg data-testid="chevron-left" />,
  ChevronRight: () => <svg data-testid="chevron-right" />,
}));

// Minimal stubs for shadcn/ui table components
jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <tr onClick={onClick} className={className}>{children}</tr>
  ),
  TableHead: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <th onClick={onClick} className={className}>{children}</th>
  ),
  TableCell: ({ children, colSpan, className }: { children: React.ReactNode; colSpan?: number; className?: string }) => (
    <td colSpan={colSpan} className={className}>{children}</td>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

interface Item {
  id: string;
  name: string;
  qty: number;
}

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'qty', label: 'Quantity', sortable: true },
  { key: 'id', label: 'ID' },
];

const data: Item[] = [
  { id: '1', name: 'Alpha', qty: 10 },
  { id: '2', name: 'Beta', qty: 5 },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.id}
      />
    );
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('ID')).toBeInTheDocument();
  });

  it('renders data rows', () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        keyExtractor={(item) => item.id}
      />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <DataTable<Item>
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
        loading
      />
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(
      <DataTable<Item>
        columns={columns}
        data={[]}
        keyExtractor={(item) => item.id}
      />
    );
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  describe('sort support', () => {
    it('shows ▲ indicator on active asc sort column', () => {
      render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          sort={{ sortBy: 'name', sortDir: 'asc', onSort: jest.fn() }}
        />
      );
      expect(screen.getByText('▲')).toBeInTheDocument();
    });

    it('shows ▼ indicator on active desc sort column', () => {
      render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          sort={{ sortBy: 'qty', sortDir: 'desc', onSort: jest.fn() }}
        />
      );
      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    it('clicking an unsorted sortable column calls onSort with asc', () => {
      const onSort = jest.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          sort={{ sortBy: null, sortDir: null, onSort }}
        />
      );
      fireEvent.click(screen.getByText('Name'));
      expect(onSort).toHaveBeenCalledWith('name', 'asc');
    });

    it('clicking the active asc column calls onSort with desc', () => {
      const onSort = jest.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          sort={{ sortBy: 'name', sortDir: 'asc', onSort }}
        />
      );
      fireEvent.click(screen.getByText('Name'));
      expect(onSort).toHaveBeenCalledWith('name', 'desc');
    });

    it('clicking the active desc column calls onSort to clear sort', () => {
      const onSort = jest.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          sort={{ sortBy: 'name', sortDir: 'desc', onSort }}
        />
      );
      fireEvent.click(screen.getByText('Name'));
      expect(onSort).toHaveBeenCalledWith(null, null);
    });

    it('non-sortable columns do not call onSort when clicked', () => {
      const onSort = jest.fn();
      render(
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          sort={{ sortBy: null, sortDir: null, onSort }}
        />
      );
      // 'ID' column has sortable: undefined, so clicking it should not trigger onSort
      fireEvent.click(screen.getByText('ID'));
      expect(onSort).not.toHaveBeenCalled();
    });
  });
});
