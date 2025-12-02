// GameTable.tsx
import React, { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { TrendingDown, TrendingUp, Clock3 } from "lucide-react";
import { DataTable } from "../DataTable";
import GameRechargeHistory from "./GameRechargeHistory";

export interface GameRowDT {
  id: number;
  name: string;
  coinsRecharged: number; // coins you bought / loaded
  lastRechargeDate?: string;
  totalCoins?: number; // net coins from backend (profit/loss in coins)
}

// helper to show "Today / Yesterday / X days ago"
function formatRelativeDay(dateStr?: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const msDiff = now.getTime() - d.getTime();
  const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// eslint-disable-next-line react-refresh/only-export-components
export const makeGameColumns = (coinValue: number): ColumnDef<GameRowDT>[] => [
  {
    header: "Game",
    accessorKey: "name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
      </div>
    ),
  },
  {
    header: "Coin Recharged",
    accessorKey: "coinsRecharged",
    cell: ({ getValue }) => (
      <span className="font-mono text-blue-700">
        {Number(getValue() || 0).toLocaleString()}
      </span>
    ),
  },
  {
    header: "Last Recharged",
    accessorKey: "lastRechargeDate",
    cell: ({ row }) => {
      const raw = row.original.lastRechargeDate;
      const pretty = formatRelativeDay(raw);

      return (
        <div className="flex flex-col text-xs">
          <span className="text-gray-700">{raw || "—"}</span>
          {raw && pretty && (
            <span className="text-gray-400 text-[11px]">{pretty}</span>
          )}
        </div>
      );
    },
  },

  // TOTAL COIN (per game net) = coinsRecharged + backend totalCoins
  {
    header: "Total coin (per game net)",
    id: "totalCoin",
    cell: ({ row }) => {
      const g = row.original;

      const recharged = g.coinsRecharged || 0;
      const netFromBackend =
        typeof g.totalCoins === "number" ? g.totalCoins : 0;

      const totalForDisplay = recharged + netFromBackend;

      const cls =
        totalForDisplay > 0
          ? "text-green-700"
          : totalForDisplay < 0
          ? "text-red-700"
          : "text-gray-500";

      return (
        <span className={`font-mono ${cls}`}>
          {totalForDisplay.toLocaleString()}
        </span>
      );
    },
  },

  // P&L in money: net (totalCoins from backend) * value
  {
    header: "P&L",
    id: "pnl",
    cell: ({ row }) => {
      const g = row.original;

      const netFromBackend =
        typeof g.totalCoins === "number" ? g.totalCoins : 0;

      const netProfitCoins = netFromBackend;
      const pnl = netProfitCoins * coinValue;

      const pos = pnl >= 0;
      const Icon = pos ? TrendingUp : TrendingDown;

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-bold inline-flex items-center ${
            pos ? "text-emerald-700 bg-emerald-100" : "text-red-700 bg-red-100"
          }`}
        >
          <Icon size={14} className="mr-1" />
          {pnl.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </span>
      );
    },
  },
];

const GameTable: React.FC<{
  data: GameRowDT[];
  coinValue: number;
  onEditStart: (id: number) => void;
  onResetRecharge: (id: number) => void;
  onDelete: (id: number) => void;
}> = ({ data, coinValue, onEditStart, onResetRecharge, onDelete }) => {
  const [historyGameId, setHistoryGameId] = useState<number | null>(null);

  const columns = makeGameColumns(coinValue);

  const closeHistory = () => setHistoryGameId(null);

  return (
    <>
      <DataTable<GameRowDT, unknown>
        columns={columns}
        data={data}
        rowActions={{
          onHistory: (row) => setHistoryGameId(row.id),
          onEdit: (row) => onEditStart(row.id),
          onReset: (row) => onResetRecharge(row.id),
          onDelete: (row) => onDelete(row.id),
        }}
      />

      {/* Separate modal with history table */}
      {historyGameId !== null && (
        <div className="fixed inset-0 z-40">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeHistory}
          />
          {/* modal */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-white text-gray-900 shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Clock3 className="text-indigo-600" size={18} />
                  <h2 className="text-sm font-semibold">Recharge History</h2>
                </div>
                <button
                  onClick={closeHistory}
                  className="px-2 py-1 text-xs rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Close
                </button>
              </div>

              <div className="p-4">
                <GameRechargeHistory gameId={historyGameId} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameTable;
