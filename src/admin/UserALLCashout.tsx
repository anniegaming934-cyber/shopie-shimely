// src/UserCashoutTable.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type FC,
} from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Clock, Trash2 } from "lucide-react";

import { apiClient } from "../apiConfig";
import { DataTable } from "../DataTable";

// --- Types from server ---
interface ServerPendingEntry {
  _id: string;
  username: string;
  playerName?: string;
  gameName: string;
  method?: string;
  totalPaid?: number;
  totalCashout?: number;
  remainingPay?: number;
  date?: string; // "YYYY-MM-DD"
  createdAt?: string; // ISO
}

// --- Row type for table ---
export interface PendingRow {
  _id: string;
  time: string; // formatted datetime
  username: string;
  playerName: string;
  gameName: string;
  method: string;
  totalPaid: number;
  totalRemaining: number;
}

// Optional: filter by username for the logged-in user
export interface UserCashoutTableProps {
  username?: string | null;
}

const fmtMoney = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const UserAllCashoutTable: FC<UserCashoutTableProps> = ({ username }) => {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ServerPendingEntry[]>(
        "/api/game-entries/pending",
        {
          params: username ? { username } : undefined,
        }
      );

      const mapped: PendingRow[] = res.data.map((e) => {
        const totalPaid = e.totalPaid ?? 0;
        const totalCashout = e.totalCashout ?? 0;
        const totalRemaining =
          e.remainingPay ?? Math.max(0, totalCashout - totalPaid);

        return {
          _id: e._id,
          time: formatDateTime(e.createdAt ?? e.date),
          username: e.username,
          playerName: e.playerName || "",
          gameName: e.gameName,
          method: e.method || "",
          totalPaid,
          totalRemaining,
        };
      });

      setRows(mapped);
    } catch (err: any) {
      console.error("Failed to load pending cashouts:", err);
      setError("Failed to load pending cashouts.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this pending cashout?")) return;

    try {
      setDeletingId(id);
      setError(null);

      // Adjust URL if you choose a different backend route
      await apiClient.delete(`/api/game-entries/pending/${id}`);

      // Option A: remove from local state
      setRows((prev) => prev.filter((r) => r._id !== id));

      // Option B: reload from server instead:
      // await loadPending();
    } catch (err: any) {
      console.error("Failed to delete pending cashout:", err);
      setError("Failed to delete pending cashout.");
    } finally {
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<PendingRow>[] = useMemo(
    () => [
      {
        header: "Time",
        accessorKey: "time",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-xs sm:text-sm">
            <Clock className="w-3 h-3 opacity-60" />
            <span>{row.original.time || "-"}</span>
          </div>
        ),
      },
      {
        header: "Username",
        accessorKey: "username",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.username}</span>
        ),
      },
      {
        header: "Player Name",
        accessorKey: "playerName",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.playerName || "-"}</span>
        ),
      },
      {
        header: "Game",
        accessorKey: "gameName",
        cell: ({ row }) => (
          <span className="text-sm">{row.original.gameName}</span>
        ),
      },
      {
        header: "Method",
        accessorKey: "method",
        cell: ({ row }) => (
          <span className="text-xs uppercase tracking-wide opacity-80">
            {row.original.method || "-"}
          </span>
        ),
      },
      {
        header: "Total Paid",
        accessorKey: "totalPaid",
        cell: ({ row }) => (
          <span className="text-sm">
            ${fmtMoney(row.original.totalPaid ?? 0)}
          </span>
        ),
      },
      {
        header: "Total Remaining",
        accessorKey: "totalRemaining",
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-red-500">
            ${fmtMoney(row.original.totalRemaining ?? 0)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const id = row.original._id;
          const isDeleting = deletingId === id;

          return (
            <button
              type="button"
              onClick={() => void handleDelete(id)}
              disabled={isDeleting}
              className="inline-flex items-center px-2 py-1 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          );
        },
      },
    ],
    [deletingId]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending Cashouts</h2>
        <button
          type="button"
          onClick={() => void loadPending()}
          className="px-3 py-1 rounded-md border text-xs sm:text-sm hover:bg-accent"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-500 border border-red-500/40 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <DataTable columns={columns} data={rows} />
      {rows.length === 0 && !loading && !error && (
        <p className="text-xs text-muted-foreground mt-2">
          No pending cashouts found.
        </p>
      )}
    </div>
  );
};

export default UserAllCashoutTable;
