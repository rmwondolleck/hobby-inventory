import { ReactNode } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface SortState {
  sortBy: string | null;
  sortDir: 'asc' | 'desc' | null;
  onSort: (key: string | null, dir: 'asc' | 'desc' | null) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    onPageChange: (offset: number) => void;
  };
  sort?: SortState;
}

function nextSort(
  sort: SortState | undefined,
  key: string,
): { sortBy: string | null; sortDir: 'asc' | 'desc' | null } {
  if (!sort || sort.sortBy !== key) return { sortBy: key, sortDir: 'asc' };
  if (sort.sortDir === 'asc') return { sortBy: key, sortDir: 'desc' };
  return { sortBy: null, sortDir: null };
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  loading = false,
  pagination,
  sort,
}: DataTableProps<T>) {
  const currentPage = pagination ? Math.floor(pagination.offset / pagination.limit) + 1 : 1;
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => {
                const isActive = sort?.sortBy === col.key;
                const indicator = isActive
                  ? sort?.sortDir === 'asc'
                    ? ' ▲'
                    : ' ▼'
                  : col.sortable
                    ? ' ⇅'
                    : '';
                return col.sortable && sort ? (
                  <TableHead
                    key={col.key}
                    className={`cursor-pointer select-none${col.className ? ` ${col.className}` : ''}`}
                    onClick={() => {
                      const { sortBy: newKey, sortDir: newDir } = nextSort(sort, col.key);
                      sort.onSort(newKey, newDir);
                    }}
                  >
                    {col.label}
                    <span aria-hidden="true" className="text-muted-foreground text-xs">{indicator}</span>
                  </TableHead>
                ) : (
                  <TableHead key={col.key} className={col.className}>{col.label}</TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => (
                <TableRow
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={onRowClick ? 'cursor-pointer hover:bg-accent' : ''}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.offset - pagination.limit)}
              disabled={pagination.offset === 0}
            >
              <ChevronLeft className="size-4 mr-1" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.offset + pagination.limit)}
              disabled={pagination.offset + pagination.limit >= pagination.total}
            >
              Next <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
