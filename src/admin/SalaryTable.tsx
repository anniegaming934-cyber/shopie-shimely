// src/SalaryTable.tsx
import React, { useEffect, useMemo, useState, type FC } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "../apiConfig";
import { DataTable } from "../DataTable";

interface SalaryRow {
  _id: string;
  username: string;
  month: string; // "2025-11"
  totalSalary: number;
  daysAbsent: number;
  remainingSalary: number;
  paidSalary?: number;
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

const fmtMoney = (n: number | undefined) =>
  (n ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const prettyMonth = (ym: string) => {
  if (!ym || ym.length < 7) return ym;
  const [y, m] = ym.split("-");
  const monthIdx = Number(m) - 1;
  const d = new Date(Number(y), monthIdx, 1);
  if (Number.isNaN(d.getTime())) return ym;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const SalaryTable: FC = () => {
  const [rows, setRows] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clearingId, setClearingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalaries = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await apiClient.get<SalaryRow[]>("/api/salaries");
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        console.error("Failed to load salaries:", err);
        setError(
          err?.response?.data?.message ||
            "Failed to load salaries. Please try again."
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSalaries();
  }, []);

  const handleClearDue = async (row: SalaryRow) => {
    if (row.remainingSalary <= 0) return;

    const confirmClear = window.confirm(
      `Clear remaining salary for ${row.username} (${prettyMonth(row.month)})?`
    );
    if (!confirmClear) return;

    try {
      setClearingId(row._id);
      setError("");

      // 👇 expects backend route: PATCH /api/salaries/:id/clear-due
      const res = await apiClient.patch<SalaryRow>(
        `/api/salaries/${row._id}/clear-due`
      );

      const updated = res.data;

      // 🔁 update local list
      setRows((prev) =>
        prev.map((r) =>
          r._id === row._id
            ? {
                ...r,
                remainingSalary: updated.remainingSalary ?? 0,
                // optional: sync other fields if backend changed them
                totalSalary:
                  updated.totalSalary !== undefined
                    ? updated.totalSalary
                    : r.totalSalary,
                daysAbsent:
                  updated.daysAbsent !== undefined
                    ? updated.daysAbsent
                    : r.daysAbsent,
                dueDate:
                  updated.dueDate !== undefined ? updated.dueDate : r.dueDate,
              }
            : r
        )
      );
    } catch (err: any) {
      console.error("Failed to clear due:", err);
      setError(
        err?.response?.data?.message || "Failed to clear due. Please try again."
      );
    } finally {
      setClearingId(null);
    }
  };

  const columns = useMemo<ColumnDef<SalaryRow>[]>(
    () => [
      {
        header: "Username",
        accessorKey: "username",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">
            {String(getValue() || "")}
          </span>
        ),
      },
      {
        header: "Month",
        accessorKey: "month",
        cell: ({ getValue }) => (
          <span className="font-medium">
            {prettyMonth(String(getValue() || ""))}
          </span>
        ),
      },
      {
        header: "Days Absent",
        accessorKey: "daysAbsent",
        cell: ({ getValue }) => (
          <span className="text-center">{Number(getValue() || 0)}</span>
        ),
      },
      {
        header: "Total Salary",
        accessorKey: "totalSalary",
        cell: ({ getValue }) => (
          <span className="font-semibold">
            {fmtMoney(Number(getValue() || 0))}
          </span>
        ),
      },
      {
        header: "Remaining Salary",
        accessorKey: "remainingSalary",
        cell: ({ getValue }) => (
          <span className="font-semibold text-red-600">
            {fmtMoney(Number(getValue() || 0))}
          </span>
        ),
      },
      {
        header: "Paid Salary",
        accessorKey: "paidSalary",
        cell: ({ row }) => {
          const total = row.original.totalSalary || 0;
          const remaining = row.original.remainingSalary || 0;
          const paid = total - remaining;
          return <span className="text-sm">{fmtMoney(paid)}</span>;
        },
      },
      {
        header: "Due Date",
        accessorKey: "dueDate",
        cell: ({ getValue }) => {
          const v = String(getValue() || "");
          if (!v) return <span className="text-xs text-gray-400">—</span>;
          return <span className="text-xs">{v}</span>;
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const r = row.original;
          const isCleared = (r.remainingSalary ?? 0) <= 0;
          const isLoading = clearingId === r._id;

          if (isCleared) {
            return (
              <span className="text-xs font-semibold text-emerald-600">
                Cleared
              </span>
            );
          }

          return (
            <button
              type="button"
              onClick={() => handleClearDue(r)}
              disabled={isLoading}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                isLoading
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              {isLoading ? "Clearing..." : "Clear Due"}
            </button>
          );
        },
      },
    ],
    [clearingId]
  );

  return (
    <div className="bg-white rounded-2xl shadow-md p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            Salary Summary (All Users)
          </h2>
          <p className="text-xs text-gray-500">
            Track total, absent days, paid and remaining salary.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-gray-500">
          Loading salary data…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
          No salary records found.
        </div>
      ) : (
        <DataTable<SalaryRow>
          columns={columns}
          data={rows}
          emptyMessage="No salary records."
        />
      )}
    </div>
  );
};

export default SalaryTable;
