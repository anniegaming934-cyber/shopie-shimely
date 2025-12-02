// src/UserTable.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "../apiConfig";
import { DataTable } from "../DataTable";
import type { Game } from "../admin/Gamerow";

const GAMES_API = "/api/games";
const GAME_ENTRIES_API = "/api/game-entries";

type EntryType = "freeplay" | "deposit" | "redeem" | "cashin" | "cashout";

interface GameEntry {
  _id: string;
  type: EntryType;
  gameName?: string;
  amount: number;
  createdAt: string;
}

interface UserTableProps {
  username?: string;
}

const safeNumber = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

type SessionValues = {
  freeplay: number;
  deposit: number;
  redeem: number;
  cashin: number;
  cashout: number;
};

type DisplayRow = Game & {
  _session: SessionValues;
  _displayTotalCoins: number;
  _totalPoints: number;
};

const UserTable: React.FC<UserTableProps> = ({ username }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [entries, setEntries] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [gamesRes, entriesRes] = await Promise.all([
        apiClient.get(GAMES_API),
        apiClient.get(GAME_ENTRIES_API, {
          params: username ? { username: username } : {},
        }),
      ]);

      if (Array.isArray(gamesRes.data)) setGames(gamesRes.data);
      if (Array.isArray(entriesRes.data)) setEntries(entriesRes.data);
    } catch (e) {
      console.error("Failed to load games/game-entries:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  /** Aggregate entries by gameName */
  const sessionByGameName = useMemo(() => {
    const map: Record<string, SessionValues> = {};

    for (const e of entries) {
      const name = (e.gameName || "").trim();
      if (!name) continue;

      const amt = safeNumber(e.amount);

      if (!map[name]) {
        map[name] = {
          freeplay: 0,
          deposit: 0,
          redeem: 0,
          cashin: 0,
          cashout: 0,
        };
      }

      if (e.type === "freeplay") map[name].freeplay += amt;
      if (e.type === "deposit") map[name].deposit += amt;
      if (e.type === "redeem") map[name].redeem += amt;
      if (e.type === "cashin") map[name].cashin += amt;
      if (e.type === "cashout") map[name].cashout += amt;
    }

    return map;
  }, [entries]);

  /** Merge games with aggregates */
  const rows: DisplayRow[] = useMemo(() => {
    return games.map((g) => {
      const nameKey = (g as any).name || "";
      const s = sessionByGameName[nameKey] || {
        freeplay: 0,
        deposit: 0,
        redeem: 0,
        cashin: 0,
        cashout: 0,
      };

      const baseTotal = safeNumber((g as any).totalCoins);

      // total coin / total point:
      // - freeplay  → subtract
      // - deposit   → subtract
      // - redeem    → add
      const adjustedTotal = baseTotal - s.freeplay - s.deposit + s.redeem;

      return {
        ...g,
        _session: s,
        _displayTotalCoins: adjustedTotal,
        _totalPoints: adjustedTotal,
      };
    });
  }, [games, sessionByGameName]);

  const columns: ColumnDef<DisplayRow>[] = useMemo(
    () => [
      {
        header: "Game",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="font-medium text-gray-800">{row.original.name}</span>
        ),
      },

      {
        header: "Freeplay (−)",
        id: "freeplay",
        cell: ({ row }) => (
          <span className="text-red-500 font-semibold">
            {row.original._session.freeplay.toLocaleString()}
          </span>
        ),
      },

      {
        header: "Deposit (−)",
        id: "deposit",
        cell: ({ row }) => (
          <span className="text-red-500 font-semibold">
            {row.original._session.deposit.toLocaleString()}
          </span>
        ),
      },

      {
        header: "Redeem (+)",
        id: "redeem",
        cell: ({ row }) => (
          <span className="text-green-600 font-semibold">
            {row.original._session.redeem.toLocaleString()}
          </span>
        ),
      },

      {
        header: "TotalPoint",
        id: "totalPoints",
        cell: ({ row }) => {
          const value = row.original.totalCoins;

          return (
            <span
              className={`font-semibold ${
                value >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {value.toLocaleString()}
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between px-3 pt-3">
        <h3 className="text-sm font-semibold text-slate-700">Games</h3>

        <button
          onClick={fetchAll}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <DataTable columns={columns as ColumnDef<any, any>[]} data={rows} />

      {rows.length === 0 && (
        <div className="text-center text-gray-500 py-6">
          No games available.
        </div>
      )}
    </div>
  );
};

export default UserTable;
