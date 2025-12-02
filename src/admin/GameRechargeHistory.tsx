// src/components/GameRechargeHistory.tsx
import React, { useEffect, useMemo, useState, type FC } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "../apiConfig";
import { DataTable } from "../DataTable";

interface RechargeHistoryRaw {
  id: string;
  gameName: string;
  date?: string;
  amount: number;
}

// UI row with before/after coins
interface RechargeHistoryRow extends RechargeHistoryRaw {
  beforeCoins: number;
  afterCoins: number;
}

interface GameRechargeHistoryProps {
  gameId: number;
}

const GameRechargeHistory: FC<GameRechargeHistoryProps> = ({ gameId }) => {
  const [rows, setRows] = useState<RechargeHistoryRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // GET /api/games/:id/recharge-history
        const { data } = await apiClient.get(
          `/api/games/${gameId}/recharge-history`
        );

        const base: RechargeHistoryRaw[] = Array.isArray(data)
          ? data.map((e: any) => ({
              id: String(e.id ?? e._id ?? Math.random()),
              gameName: e.gameName,
              date: e.date,
              amount: Number(e.amount ?? 0),
              username: e.username,
              createdBy: e.createdBy,
              method: e.method,
            }))
          : [];

        // Sort by date ascending (older first) so before/after make sense
        base.sort((a, b) => {
          const da = a.date ?? "";
          const db = b.date ?? "";
          return da.localeCompare(db);
        });

        // Compute running before/after coins based purely on recharge amount
        let running = 0;
        const enriched: RechargeHistoryRow[] = base.map((r) => {
          const before = running;
          const after = before + (Number.isFinite(r.amount) ? r.amount : 0);
          running = after;
          return {
            ...r,
            beforeCoins: before,
            afterCoins: after,
          };
        });

        setRows(enriched);
      } catch (err) {
        console.error("Failed to load recharge history:", err);
        setError("Failed to load recharge history");
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      loadHistory();
    } else {
      setRows([]);
    }
  }, [gameId]);

  const columns: ColumnDef<RechargeHistoryRow>[] = useMemo(
    () => [
      {
        header: "Game",
        accessorKey: "gameName",
        cell: ({ row }) => (
          <span className="text-xs font-medium text-gray-800">
            {row.original.gameName}
          </span>
        ),
      },
      {
        header: "Date",
        accessorKey: "date",
        cell: ({ row }) => (
          <span className="text-xs text-gray-700">
            {row.original.date || "—"}
          </span>
        ),
      },
      {
        header: "Before Coins",
        id: "beforeCoins",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-600">
            {row.original.beforeCoins.toLocaleString()}
          </span>
        ),
      },
      {
        header: "Recharge Coins",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-blue-700">
            {row.original.amount.toLocaleString()}
          </span>
        ),
      },
      {
        header: "After Coins",
        id: "afterCoins",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-emerald-700">
            {row.original.afterCoins.toLocaleString()}
          </span>
        ),
      },
    ],
    []
  );

  if (error) {
    return <div className="text-xs text-red-500 px-2 py-1">{error}</div>;
  }

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-white">
      <DataTable<RechargeHistoryRow, unknown>
        columns={columns}
        data={rows}
        isLoading={loading}
        emptyMessage="No recharge history available."
      />
    </div>
  );
};

export default GameRechargeHistory;
