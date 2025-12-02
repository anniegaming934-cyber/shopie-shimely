// src/components/GameStatCards.tsx

import React, { type FC, useEffect, useState } from "react";
import { DollarSign, Coins, TrendingUp } from "lucide-react";
import { apiClient } from "../apiConfig";

/* =========================
   1) TYPES
========================= */
type Period = "day" | "week" | "month";

interface GameSummary {
  revenueCashApp: number;
  revenueChime: number;
  revenuePayPal: number;
  revenueVenmo: number;
  totalCoin: number;
  totalDeposit: number;
  totalExtraMoney: number;
  totalFreeplay: number;
  totalPendingCount: number;
  totalPendingRemainingPay: number;
  totalPlayedGame: number;
  totalRedeem: number;
  totalReduction: number;
  totalRevenue: number;
}

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  color: {
    border: string; // border-top color
    text: string; // icon/text accent
    bg: string; // icon pill bg
  };
  isCurrency?: boolean;
  emphasizeNegative?: boolean; // style negatives in red/semibold
}

interface GameStatCardsProps {
  // Optional: per-user summary: /api/game-entries/summary?username=...
  username?: string | null;
}

/* =========================
   2) HELPERS
========================= */

const formatCurrency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const formatNumber = (n: number) =>
  n.toLocaleString(undefined, { maximumFractionDigits: 0 });

/* =========================
   3) REUSABLE STAT CARD
========================= */

const StatCard: FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  isCurrency = false,
  emphasizeNegative = false,
}) => {
  const isNeg = value < 0 && emphasizeNegative;

  return (
    <div
      className="bg-white p-6 rounded-2xl shadow-md border-t-4 transition hover:shadow-lg"
      style={{ borderColor: color.border }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: color.bg }}
        >
          <Icon className="w-5 h-5" style={{ color: color.text }} />
        </div>

        <span className="text-gray-500 tracking-widest text-xs font-semibold select-none">
          {title.toUpperCase()}
        </span>
      </div>

      <div className="mt-4">
        <div
          className={`text-3xl font-extrabold ${
            isNeg ? "text-red-600" : "text-gray-900"
          }`}
        >
          {isCurrency ? formatCurrency(value) : formatNumber(value)}
        </div>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

/* =========================
   4) COLOR PALETTES
========================= */

const palettes = {
  totalRevenue: {
    border: "#0ea5a7",
    text: "#059669",
    bg: "rgba(16,185,129,0.12)",
  }, // teal/green
  deposit: {
    border: "#6366f1",
    text: "#4f46e5",
    bg: "rgba(99,102,241,0.12)",
  }, // indigo
  redeem: {
    border: "#ef4444",
    text: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
  }, // red
  coins: {
    border: "#f59e0b",
    text: "#b45309",
    bg: "rgba(245,158,11,0.12)",
  }, // amber
  extra: {
    border: "#8b5cf6",
    text: "#7c3aed",
    bg: "rgba(139,92,246,0.12)",
  }, // violet
  pending: {
    border: "#0ea5e9",
    text: "#0369a1",
    bg: "rgba(14,165,233,0.12)",
  }, // sky
  misc: {
    border: "#6b7280",
    text: "#374151",
    bg: "rgba(107,114,128,0.12)",
  }, // gray
};

/* =========================
   5) MAIN COMPONENT
   Uses /api/game-entries/summary data in cards
========================= */

export const GameStatCards: FC<GameStatCardsProps> = ({ username }) => {
  const [summary, setSummary] = useState<GameSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<Period>("day"); // "day" | "week" | "month"

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        // Build query string with username + period
        const params = new URLSearchParams();
        params.set("period", period); // backend: "day" | "week" | "month"
        if (username) params.set("username", username);

        const res = await apiClient.get<GameSummary>(
          `/api/game-entries/summary?${params.toString()}`
        );
        setSummary(res.data ?? null);
      } catch (err) {
        console.error("Failed to fetch game summary:", err);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [username, period]);

  const revenueSubtitle =
    summary &&
    [
      `CashApp ${formatCurrency(summary.revenueCashApp)}`,
      `Chime ${formatCurrency(summary.revenueChime)}`,
      `PayPal ${formatCurrency(summary.revenuePayPal)}`,
      `Venmo ${formatCurrency(summary.revenueVenmo)}`,
    ].join(" · ");

  const periodLabel: Record<Period, string> = {
    day: "Today",
    week: "This Week",
    month: "This Month",
  };

  return (
    <div className="max-w-8xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Showing stats for{" "}
            <span className="font-semibold">{periodLabel[period]}</span>
          </p>
        </div>

        {/* Day / Week / Month filter */}
        <div className="inline-flex bg-gray-100 rounded-full p-1">
          {(["day", "week", "month"] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-xs md:text-sm rounded-full font-medium transition ${
                period === p
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {p === "day" ? "Day" : p === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className="mt-6 text-sm text-gray-500">Loading game statistics…</p>
      )}

      {!loading && !summary && (
        <p className="mt-6 text-sm text-gray-500">
          No statistics available for this account.
        </p>
      )}

      {summary && !loading && (
        <>
          {/* Row 1: Money overview */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Revenue"
              value={summary.totalRevenue}
              subtitle={
                revenueSubtitle || "Combined revenue across all payment methods"
              }
              icon={DollarSign}
              color={palettes.totalRevenue}
              isCurrency
            />
            <StatCard
              title="Total Deposits"
              value={summary.totalDeposit}
              subtitle="All confirmed deposits (before reductions)"
              icon={DollarSign}
              color={palettes.deposit}
              isCurrency
            />
            <StatCard
              title="Total Redeems"
              value={summary.totalRedeem}
              subtitle="Total redeemed amount paid out to players"
              icon={DollarSign}
              color={palettes.redeem}
              isCurrency
            />
            <StatCard
              title="Net Coins"
              value={summary.totalCoin}
              subtitle="Overall coin balance (redeem − freeplay − played − deposit)"
              icon={Coins}
              color={palettes.coins}
              emphasizeNegative
            />
          </div>

          {/* Row 2: Coins + extras + pending */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Freeplay Coins"
              value={summary.totalFreeplay}
              subtitle="Total coins given as freeplay"
              icon={Coins}
              color={palettes.extra}
            />
            <StatCard
              title="Extra Money"
              value={summary.totalExtraMoney}
              subtitle="Additional adjustments / extra money"
              icon={TrendingUp}
              color={palettes.misc}
              isCurrency
              emphasizeNegative
            />
            <StatCard
              title="Pending Payouts"
              value={summary.totalPendingRemainingPay}
              subtitle={`Pending requests: ${formatNumber(
                summary.totalPendingCount
              )}`}
              icon={DollarSign}
              color={palettes.pending}
              isCurrency
            />
            <StatCard
              title="Total Reduction"
              value={summary.totalReduction}
              subtitle="Manual reductions / adjustments applied"
              icon={TrendingUp}
              color={palettes.redeem}
              isCurrency
              emphasizeNegative
            />
          </div>
        </>
      )}
    </div>
  );
};

export default GameStatCards;
