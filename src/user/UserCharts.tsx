// src/UserCharts.tsx
import React, { useEffect, useState } from "react";
import type { FC } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface GameStatPoint {
  date: string; // "2025-11-05"
  gameId: number;
  gameName: string;
  coinsSpent: number;
  coinsEarned: number;
  coinsRecharged: number;
}

interface UserChartsProps {
  games: any[]; // kept for compatibility, data comes from API instead
  coinValue: number;
}

type Range = "day" | "week" | "month" | "year";

// Simple color palette for pie slices
const PIE_COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#6366f1"];

const UserCharts: FC<UserChartsProps> = ({ coinValue }) => {
  const [range, setRange] = useState<Range>("week");
  const [stats, setStats] = useState<GameStatPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/stats/game-coins?range=${range}`);
        const json = await res.json();
        setStats(json.stats || []);
      } catch (e) {
        console.error("Failed to load chart stats:", e);
        setStats([]);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [range]);

  if (!stats.length && !loading) {
    return (
      <section className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Game Analytics
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
            No data
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Not enough activity yet to display charts for this period.
        </p>
      </section>
    );
  }

  // --------- Aggregations for charts ---------

  // Line: total net coins per day across all games
  const netByDateMap: Record<string, { date: string; netCoins: number }> = {};

  for (const s of stats) {
    const net = s.coinsEarned + s.coinsRecharged - s.coinsSpent;
    if (!netByDateMap[s.date]) {
      netByDateMap[s.date] = { date: s.date, netCoins: 0 };
    }
    netByDateMap[s.date].netCoins += net;
  }

  const lineData = Object.values(netByDateMap).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Bar: net coins per game in selected period
  const netByGameMap: Record<number, { name: string; netCoins: number }> = {};

  for (const s of stats) {
    const net = s.coinsEarned + s.coinsRecharged - s.coinsSpent;
    if (!netByGameMap[s.gameId]) {
      netByGameMap[s.gameId] = { name: s.gameName, netCoins: 0 };
    }
    netByGameMap[s.gameId].netCoins += net;
  }

  const barData = Object.values(netByGameMap);

  // Pie: revenue (recharged * coinValue) per game
  const revenueByGameMap: Record<number, { name: string; revenueUSD: number }> =
    {};

  for (const s of stats) {
    const revenue = s.coinsRecharged * coinValue;
    if (!revenueByGameMap[s.gameId]) {
      revenueByGameMap[s.gameId] = { name: s.gameName, revenueUSD: 0 };
    }
    revenueByGameMap[s.gameId].revenueUSD += revenue;
  }

  const pieData = Object.values(revenueByGameMap).map((r) => ({
    name: r.name,
    value: Number(r.revenueUSD.toFixed(2)),
  }));

  return (
    <section className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          Game Analytics
        </h2>

        {/* Range selector */}
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1">
          {(["day", "week", "month", "year"] as Range[]).map((r) => {
            const label =
              r === "day"
                ? "Day"
                : r === "week"
                ? "Week"
                : r === "month"
                ? "Month"
                : "Year";
            const isActive = range === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-xs rounded-full transition ${
                  isActive
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
        <p className="text-xs text-gray-500 mb-4">Loading chart data…</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Net Coins by Day
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="netCoins"
                name="Net Coins"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Net Coins per Game ({range})
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="netCoins"
                name="Net Coins"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Revenue by Game (USD, {range})
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={75}
                innerRadius={35}
                paddingAngle={3}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default UserCharts;
