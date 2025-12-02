import React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Pencil, KeyRound, RotateCcw, Trash2, Clock3 } from "lucide-react";

type RowActions<TData> = {
  onEdit?: (row: TData) => void;
  onResetPassword?: (row: TData) => void;
  onReset?: (row: TData) => void; // e.g. reset stats/coins
  onDelete?: (row: TData) => void;
  onHistory?: (row: TData) => void; // NEW: open history table / modal
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  // row click (for router navigation)
  onRowClick?: (row: TData) => void;
  // built-in actions column
  rowActions?: RowActions<TData>;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data to display.",
  onRowClick,
  rowActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const allColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    const hasAnyAction =
      rowActions &&
      (rowActions.onEdit ||
        rowActions.onResetPassword ||
        rowActions.onReset ||
        rowActions.onDelete ||
        rowActions.onHistory);

    if (!hasAnyAction) return columns;

    const actionsCol: ColumnDef<TData, TValue> = {
      id: "__actions",
      header: "Actions",
      cell: ({ row }) => {
        const original = row.original as TData;

        return (
          <div
            className="flex items-center gap-2 justify-end"
            onClick={(e) => e.stopPropagation()} // don't trigger row onClick
          >
            {rowActions?.onHistory && (
              <button
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
                onClick={() => rowActions.onHistory?.(original)}
              >
                <Clock3 className="w-3 h-3" />
                History
              </button>
            )}

            {rowActions?.onEdit && (
              <button
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
                onClick={() => rowActions.onEdit?.(original)}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}

            {rowActions?.onResetPassword && (
              <button
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
                onClick={() => rowActions.onResetPassword?.(original)}
              >
                <KeyRound className="w-3 h-3" />
                Reset PW
              </button>
            )}

            {rowActions?.onReset && (
              <button
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
                onClick={() => rowActions.onReset?.(original)}
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}

            {rowActions?.onDelete && (
              <button
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border rounded text-red-600 hover:bg-red-50"
                onClick={() => rowActions.onDelete?.(original)}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        );
      },
    };

    return [...columns, actionsCol];
  }, [columns, rowActions]);

  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full overflow-x-auto border rounded-md">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sorted = header.column.getIsSorted();

                return (
                  <th
                    key={header.id}
                    className={`px-3 py-2 border-b text-left font-semibold ${
                      canSort ? "cursor-pointer select-none" : ""
                    }`}
                    onClick={
                      canSort
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort && (
                          <span className="text-[10px] opacity-70">
                            {sorted === "asc" && "▲"}
                            {sorted === "desc" && "▼"}
                            {!sorted && "⇵"}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={table.getAllLeafColumns().length}
                className="px-3 py-4 text-center text-gray-500"
              >
                Loading…
              </td>
            </tr>
          ) : table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={table.getAllLeafColumns().length}
                className="px-3 py-4 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b ${
                  onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                }`}
                onClick={
                  onRowClick ? () => onRowClick(row.original) : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-600">
        <div>
          Page{" "}
          <strong>
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </strong>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 border rounded disabled:opacity-40"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            ⏮
          </button>
          <button
            className="px-2 py-1 border rounded disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            ◀
          </button>
          <button
            className="px-2 py-1 border rounded disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            ▶
          </button>
          <button
            className="px-2 py-1 border rounded disabled:opacity-40"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}
