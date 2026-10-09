import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'w-full bg-[#161618] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl',
        className
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#121214]">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    'py-3.5 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-sm text-white">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-[#8E8E93]">
                  {emptyState || 'No records found.'}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={cn('py-3.5 px-4 align-middle', col.className)}>
                      {col.cell
                        ? col.cell(row)
                        : col.accessorKey
                        ? (row[col.accessorKey] as React.ReactNode)
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
