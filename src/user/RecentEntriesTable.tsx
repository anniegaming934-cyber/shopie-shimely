import React, { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "../DataTable";

export type EntryType = "freeplay" | "deposit" | "redeem";

export interface GameEntry {
  _id: string;
  type: EntryType;
  playerName: string;
  gameName?: string;
  amount: number;
  amountBase?: number;
  bonusRate?: number;
  bonusAmount?: number;
  amountFinal?: number;
  note?: string;
  date?: string;
  createdAt: string;
}

interface RecentEntriesTableProps {
  recent: GameEntry[];
  onRefresh: () => void;
  title?: string;
}

const fmtMoney = (n?: number) =>
  n == null
    ? "–"
    : n.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

const fmtPct = (n?: number) =>
  n == null || Number.isNaN(n) ? "–" : `${n.toFixed(2)}%`;

/* -------------------------------------------------------
    🕒 NEPAL TIME FORMATTERS
------------------------------------------------------- */

// Convert any ISO → Date in Nepal timezone
const toNepalDate = (iso: string) =>
  new Date(
    new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Kathmandu" })
  );

// Date format → "12 nov 2025"
const formatDateLabel = (d: Date) => {
  const day = d.toLocaleString("en-US", {
    timeZone: "Asia/Kathmandu",
    day: "numeric",
  });

  const mon = d
    .toLocaleString("en-US", {
      timeZone: "Asia/Kathmandu",
      month: "short",
    })
    .toLowerCase();

  const yr = d.toLocaleString("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
  });

  return `${day} ${mon} ${yr}`;
};

// Time format → "03:45 pm"
const formatTimeLabel = (d: Date) => {
  return d
    .toLocaleTimeString([], {
      timeZone: "Asia/Kathmandu",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
};

/* -------------------------------------------------------
    🧮 TABLE
------------------------------------------------------- */

const RecentEntriesTable: React.FC<RecentEntriesTableProps> = ({
  recent,
  onRefresh,
  title = "Recent Entries",
}) => {
  const rows = useMemo(() => {
    return recent.map((r) => {
      const whenISO = r.createdAt;

      const whenNepal = toNepalDate(whenISO);

      const finalAmt = r.amountFinal ?? r.amount ?? 0;

      const baseAmt =
        r.amountBase ?? (r.type === "redeem" ? finalAmt : undefined);

      const bonusAmt =
        r.bonusAmount ??
        (baseAmt != null ? Math.max(0, finalAmt - baseAmt) : undefined);

      const bonusPct =
        r.bonusRate ??
        (baseAmt && bonusAmt != null && baseAmt > 0
          ? (bonusAmt / baseAmt) * 100
          : undefined);

      return {
        ...r,
        _whenDate: formatDateLabel(whenNepal), // NEPAL DATE
        _whenTime: formatTimeLabel(whenNepal), // NEPAL TIME
        _finalAmount: finalAmt,
        _baseAmount: baseAmt,
        _bonusAmount: bonusAmt,
        _bonusRate: bonusPct,
      };
    });
  }, [recent]);

  type Row = (typeof rows)[number];

  const columns = useMemo<ColumnDef<Row>[]>(() => {
    return [
      {
        header: "Date",
        accessorKey: "_whenDate",
        sortingFn: (a, b) => {
          const ta = new Date(
            toNepalDate(a.original.date || a.original.createdAt)
          ).getTime();
          const tb = new Date(
            toNepalDate(b.original.date || b.original.createdAt)
          ).getTime();
          return ta - tb;
        },
        cell: ({ row }) => row.original._whenDate,
      },
      {
        header: "Time",
        accessorKey: "_whenTime",
        cell: ({ row }) => row.original._whenTime,
      },
      {
        header: "Type",
        accessorKey: "type",
        cell: ({ getValue }) =>
          String(getValue()).charAt(0).toUpperCase() +
          String(getValue()).slice(1),
      },
      {
        header: "Player",
        accessorKey: "playerName",
      },
      {
        header: "Game",
        accessorKey: "gameName",
        cell: ({ getValue }) => getValue() || "–",
      },
      {
        header: "Base",
        accessorKey: "_baseAmount",
        cell: ({ row }) => fmtMoney(row.original._baseAmount),
      },
      {
        header: "Bonus",
        id: "bonusCombo",
        cell: ({ row }) => {
          const r = row.original;
          const hasBonus =
            r._bonusAmount != null && r._bonusAmount > 0 && r.type !== "redeem";

          return hasBonus
            ? `${fmtMoney(r._bonusAmount)} (${fmtPct(r._bonusRate)})`
            : "–";
        },
      },
      {
        header: "Amount (Final)",
        accessorKey: "_finalAmount",
        cell: ({ row }) => fmtMoney(row.original._finalAmount),
      },
      {
        header: "Note",
        accessorKey: "note",
        cell: ({ getValue }) => getValue() || "–",
      },
    ];
  }, []);

  return (
    <div className="w-full rounded-2xl border p-4 md:p-6 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-md font-semibold">{title}</h3>
        <button onClick={onRefresh} className="text-sm underline">
          Refresh
        </button>
      </div>

      <DataTable<Row, unknown>
        columns={columns}
        data={rows}
        emptyMessage="No entries yet."
      />
    </div>
  );
};

export default RecentEntriesTable;
