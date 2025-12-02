// src/components/AdminUserHistory.tsx  (or UserHistory.tsx)
import React, { useEffect, useMemo, useState, type FC } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { apiClient } from "../apiConfig";
import { DataTable } from "../DataTable";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  type ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

export interface UserHistoryProps {
  // This is actually the username passed from AdminDashboard
  username: string | null;
}

interface LoginSessionRow {
  _id: string;
  username: string;
  signInAt?: string | null;
  signOutAt?: string | null;
}

interface GameEntryRow {
  _id: string;
  username: string;
  type: "deposit" | "freeplay" | "redeem" | string;
  method?: string;
  playerName?: string;
  playerTag?: string;
  gameName: string;
  amountBase?: number;
  amountFinal?: number;
  amount?: number;
  date?: string;
  createdAt?: string;
  note?: string;
}

interface SalaryRow {
  _id: string;
  username: string;
  month: string; // "2025-11"
  totalSalary: number;
  daysAbsent?: number;
  paidSalary?: number;
  remainingSalary?: number;
  dueDate?: string;
  note?: string;
}

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
};

const fmtAmount = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getEntryAmount = (e: GameEntryRow): number => {
  if (typeof e.amountFinal === "number") return e.amountFinal;
  if (typeof e.amountBase === "number") return e.amountBase;
  if (typeof e.amount === "number") return e.amount;
  return 0;
};

const getDurationMinutes = (s: LoginSessionRow): number | null => {
  if (!s.signInAt || !s.signOutAt) return null;
  const start = new Date(s.signInAt).getTime();
  const end = new Date(s.signOutAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return (end - start) / (1000 * 60);
};

// helper for date range filter
const inDateRange = (
  iso: string | undefined | null,
  fromDate: string,
  toDate: string
) => {
  if (!fromDate && !toDate) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;

  if (fromDate) {
    const fromT = new Date(fromDate + "T00:00:00").getTime();
    if (t < fromT) return false;
  }
  if (toDate) {
    const toT = new Date(toDate + "T23:59:59").getTime();
    if (t > toT) return false;
  }
  return true;
};

const UserHistory: FC<UserHistoryProps> = ({ username }) => {
  const [sessions, setSessions] = useState<LoginSessionRow[]>([]);
  const [entries, setEntries] = useState<GameEntryRow[]>([]);
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Date filters (applies to sessions + game entries + summary, NOT salary)
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const loadAll = async () => {
      if (!username) {
        setSessions([]);
        setEntries([]);
        setSalaries([]);
        return;
      }

      setLoading(true);
      try {
        console.log("🔍 Loading user overview for:", username);

        const [sessionsRes, entriesRes, salaryRes] = await Promise.all([
          apiClient.get<LoginSessionRow[]>("/api/logins", {
            params: { username },
          }),
          apiClient.get<GameEntryRow[]>("/api/game-entries", {
            params: { username, limit: 500 },
          }),
          apiClient
            .get<SalaryRow[]>("/api/salaries", {
              params: { username },
            })
            .catch(() => ({ data: [] as SalaryRow[] })),
        ]);

        setSessions(Array.isArray(sessionsRes.data) ? sessionsRes.data : []);
        setEntries(Array.isArray(entriesRes.data) ? entriesRes.data : []);
        setSalaries(Array.isArray(salaryRes.data) ? salaryRes.data : []);
      } catch (err) {
        console.error("Failed to load user overview:", err);
        setSessions([]);
        setEntries([]);
        setSalaries([]);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [username]);

  // 🔹 Filter by username + date range for sessions
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => !username || s.username === username)
      .sort((a, b) => {
        const ta = a.signInAt ? new Date(a.signInAt).getTime() : 0;
        const tb = b.signInAt ? new Date(b.signInAt).getTime() : 0;
        return tb - ta;
      })
      .filter((s) => inDateRange(s.signInAt, fromDate, toDate));
  }, [sessions, username, fromDate, toDate]);

  // 🔹 Filter by username + date range for game entries
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => !username || e.username === username)
      .sort((a, b) => {
        const da = a.createdAt || a.date;
        const db = b.createdAt || b.date;
        const ta = da ? new Date(da).getTime() : 0;
        const tb = db ? new Date(db).getTime() : 0;
        return tb - ta;
      })
      .filter((e) =>
        inDateRange(e.createdAt || e.date || null, fromDate, toDate)
      );
  }, [entries, username, fromDate, toDate]);

  // 🔹 Game stats based on filtered entries
  const gameStats = useMemo(() => {
    const perGame: Record<
      string,
      {
        gameName: string;
        timesPlayed: number;
        totalAmount: number;
        depositAmount: number;
        redeemAmount: number;
        freeplayAmount: number;
      }
    > = {};

    filteredEntries.forEach((e) => {
      const name = e.gameName || "Unknown";
      const amt = getEntryAmount(e);

      if (!perGame[name]) {
        perGame[name] = {
          gameName: name,
          timesPlayed: 0,
          totalAmount: 0,
          depositAmount: 0,
          redeemAmount: 0,
          freeplayAmount: 0,
        };
      }

      perGame[name].timesPlayed += 1;
      perGame[name].totalAmount += amt;

      if (e.type === "deposit") perGame[name].depositAmount += amt;
      if (e.type === "redeem") perGame[name].redeemAmount += amt;
      if (e.type === "freeplay") perGame[name].freeplayAmount += amt;
    });

    return Object.values(perGame).sort((a, b) =>
      a.gameName.localeCompare(b.gameName)
    );
  }, [filteredEntries]);

  // 🔹 Summary totals computed from filtered entries (respects date range)
  //    Total Points Used = deposit + freeplay
  //    Profit = Total Cash In (deposit) - Total Cash Out (redeem)
  const { totalDeposit, totalRedeem, totalFreeplay, totalPointsUsed, profit } =
    useMemo(() => {
      let deposit = 0;
      let redeem = 0;
      let freeplay = 0;

      filteredEntries.forEach((e) => {
        const amt = getEntryAmount(e);
        if (e.type === "deposit") deposit += amt;
        if (e.type === "redeem") redeem += amt;
        if (e.type === "freeplay") freeplay += amt;
      });

      const totalPointsUsed = deposit + freeplay; // deposit + freeplay only
      const profit = deposit - redeem; // ✅ profit = total cash in - total cash out

      return {
        totalDeposit: deposit,
        totalRedeem: redeem,
        totalFreeplay: freeplay,
        totalPointsUsed,
        profit,
      };
    }, [filteredEntries]);

  const totalSessions = filteredSessions.length;

  const salaryTotals = useMemo(() => {
    let totalSalary = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    salaries.forEach((s) => {
      const total = Number(s.totalSalary) || 0;
      const remaining = Number(s.remainingSalary) || 0;
      const paid =
        typeof s.paidSalary === "number"
          ? s.paidSalary
          : Math.max(0, total - remaining);

      totalSalary += total;
      totalPaid += paid;
      totalRemaining += remaining;
    });

    return { totalSalary, totalPaid, totalRemaining };
  }, [salaries]);

  // 🔹 Doughnut chart (Deposit / Redeem / Freeplay / Points Used / Profit)
  const profitSlice = profit > 0 ? profit : 0; // chart cannot have negative slice
  const summaryPieData = {
    labels: ["Deposit", "Redeem", "Freeplay", "Points Used", "Profit"],
    datasets: [
      {
        label: "Coins",
        data: [
          totalDeposit,
          totalRedeem,
          totalFreeplay,
          totalPointsUsed,
          profitSlice,
        ],
        backgroundColor: [
          "#22c55e", // Deposit
          "#ef4444", // Redeem
          "#3b82f6", // Freeplay
          "#a855f7", // Points Used
          "#f97316", // Profit
        ],
        borderColor: ["#16a34a", "#b91c1c", "#1d4ed8", "#7e22ce", "#c2410c"],
        borderWidth: 1,
      },
    ],
  };

  const summaryPieTotal =
    totalDeposit +
      totalRedeem +
      totalFreeplay +
      totalPointsUsed +
      profitSlice || 0;

  const summaryPieOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      title: {
        display: true,
        text: "Coins Overview",
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || "";
            const raw = ctx.raw as number;
            let value = raw;
            if (label === "Profit") value = profit; // show signed profit
            const total = summaryPieTotal || 1;
            const pct = ((Math.abs(raw) / total) * 100).toFixed(1);
            return `${label}: ${fmtAmount(value)} (${pct}%)`;
          },
        },
      },
    },
  };

  const sessionColumns = useMemo<ColumnDef<LoginSessionRow, any>[]>(
    () => [
      {
        header: "Sign In",
        accessorKey: "signInAt",
        cell: ({ row }) => fmtDateTime(row.original.signInAt),
      },
      {
        header: "Sign Out",
        accessorKey: "signOutAt",
        cell: ({ row }) => fmtDateTime(row.original.signOutAt),
      },
      {
        id: "duration",
        header: "Duration (min)",
        cell: ({ row }) => {
          const mins = getDurationMinutes(row.original);
          return mins == null ? "-" : fmtAmount(mins);
        },
      },
    ],
    []
  );

  const gameStatColumns = useMemo<ColumnDef<(typeof gameStats)[number], any>[]>(
    () => [
      { header: "Game", accessorKey: "gameName" },
      { header: "# Entries", accessorKey: "timesPlayed" },
      {
        header: "Total Points",
        accessorKey: "totalAmount",
        cell: ({ row }) => fmtAmount(row.original.totalAmount),
      },
      {
        header: "Deposit",
        accessorKey: "depositAmount",
        cell: ({ row }) => fmtAmount(row.original.depositAmount),
      },
      {
        header: "Redeem",
        accessorKey: "redeemAmount",
        cell: ({ row }) => fmtAmount(row.original.redeemAmount),
      },
      {
        header: "Freeplay",
        accessorKey: "freeplayAmount",
        cell: ({ row }) => fmtAmount(row.original.freeplayAmount),
      },
    ],
    []
  );

  const entryColumns = useMemo<ColumnDef<GameEntryRow, any>[]>(
    () => [
      {
        header: "Date",
        accessorKey: "createdAt",
        cell: ({ row }) =>
          fmtDateTime(row.original.createdAt || row.original.date),
      },
      {
        header: "Type",
        accessorKey: "type",
        cell: ({ row }) => {
          const t = row.original.type;
          switch (t) {
            case "deposit":
              return "Deposit";
            case "freeplay":
              return "Freeplay";
            case "redeem":
              return "Redeem";
            default:
              return t || "-";
          }
        },
      },
      { header: "Game", accessorKey: "gameName" },
      {
        header: "Player",
        id: "player",
        cell: ({ row }) => {
          const { playerName, playerTag } = row.original;
          if (playerName && playerTag) return `${playerName} (${playerTag})`;
          if (playerName) return playerName;
          if (playerTag) return playerTag;
          return "-";
        },
      },
      {
        header: "Method",
        accessorKey: "method",
        cell: ({ row }) => row.original.method || "-",
      },
      {
        header: "Amount",
        id: "amount",
        cell: ({ row }) => fmtAmount(getEntryAmount(row.original)),
      },
      {
        header: "Note",
        accessorKey: "note",
        cell: ({ row }) => row.original.note || "-",
      },
    ],
    []
  );

  const salaryColumns = useMemo<ColumnDef<SalaryRow, any>[]>(
    () => [
      { header: "Month", accessorKey: "month" },
      {
        header: "Total Salary",
        accessorKey: "totalSalary",
        cell: ({ row }) => fmtAmount(Number(row.original.totalSalary || 0)),
      },
      {
        header: "Paid",
        id: "paid",
        cell: ({ row }) => {
          const s = row.original;
          const total = Number(s.totalSalary) || 0;
          const remaining = Number(s.remainingSalary) || 0;
          const paid =
            typeof s.paidSalary === "number"
              ? s.paidSalary
              : Math.max(0, total - remaining);
          return fmtAmount(paid);
        },
      },
      {
        header: "Remaining",
        accessorKey: "remainingSalary",
        cell: ({ row }) => fmtAmount(Number(row.original.remainingSalary || 0)),
      },
      {
        header: "Due Date",
        accessorKey: "dueDate",
        cell: ({ row }) => fmtDate(row.original.dueDate),
      },
      {
        header: "Note",
        accessorKey: "note",
        cell: ({ row }) => row.original.note || "-",
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          User Overview {username ? `· ${username}` : ""}
        </h1>
        <p className="text-sm text-gray-500">
          Sign-ins, salary, and game activity for this user.
        </p>
      </div>

      {/* Date filter bar + doughnut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* LEFT SIDE — DATE FILTERS */}
        <div className="lg:col-span-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full border rounded px-3 py-1.5 text-sm"
            />
          </div>
        </div>

        {/* RIGHT SIDE — SMALL DOUGHNUT CHART */}
        <div className="lg:col-span-2 flex items-center justify-center">
          <div
            className="bg-white border rounded-md p-3 flex items-center justify-center"
            style={{ width: "380px", height: "380px" }}
          >
            {summaryPieTotal <= 0 ? (
              <p className="text-xs text-gray-500 text-center">No activity</p>
            ) : (
              <Doughnut
                data={summaryPieData}
                options={{
                  ...summaryPieOptions,
                  maintainAspectRatio: false,
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-sm">
          <div className="p-3 border rounded-md bg-white">
            <div className="text-xs text-gray-500">Total Cash In (Deposit)</div>
            <div className="text-lg font-semibold">
              {fmtAmount(totalDeposit)}
            </div>
          </div>
          <div className="p-3 border rounded-md bg-white">
            <div className="text-xs text-gray-500">Total Cash Out (Redeem)</div>
            <div className="text-lg font-semibold">
              {fmtAmount(totalRedeem)}
            </div>
          </div>
          <div className="p-3 border rounded-md bg-white">
            <div className="text-xs text-gray-500">Total Freeplay</div>
            <div className="text-lg font-semibold">
              {fmtAmount(totalFreeplay)}
            </div>
          </div>
          <div className="p-3 border rounded-md bg-white">
            <div className="text-xs text-gray-500">Total Points Used</div>
            <div className="text-lg font-semibold">
              {fmtAmount(Math.abs(totalPointsUsed))}
            </div>
          </div>
          <div className="p-3 border rounded-md bg-white">
            <div className="text-xs text-gray-500">Profit</div>
            <div className="text-lg font-semibold">{fmtAmount(profit)}</div>
          </div>
          <div className="p-3 border rounded-md bg-white">
            <div className="text-xs text-gray-500">Number of Games</div>
            <div className="text-lg font-semibold">{gameStats.length}</div>
          </div>
          <div className="p-3 border rounded-md bg-white">
            <div className="text-xs text-gray-500">Sign-in Sessions</div>
            <div className="text-lg font-semibold">{totalSessions}</div>
          </div>
        </div>
      </div>

      {/* Sessions table */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Sign-in Sessions</h2>
        <DataTable<LoginSessionRow, any>
          columns={sessionColumns}
          data={filteredSessions}
          isLoading={loading}
          emptyMessage="No sessions for this user."
        />
      </div>

      {/* Per-game stats */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Game Usage by Game</h2>
        <DataTable<(typeof gameStats)[number], any>
          columns={gameStatColumns}
          data={gameStats}
          isLoading={loading}
          emptyMessage="No game entries for this user."
        />
      </div>

      {/* Raw entries */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">All Game Entries</h2>
        <DataTable<GameEntryRow, any>
          columns={entryColumns}
          data={filteredEntries}
          isLoading={loading}
          emptyMessage="No game entries for this user."
        />
      </div>

      {/* Salary rows (NO date filter) */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">Salary History</h2>
        <DataTable<SalaryRow, any>
          columns={salaryColumns}
          data={salaries}
          isLoading={loading}
          emptyMessage="No salary records for this user."
        />
      </div>
    </div>
  );
};

export default UserHistory;
