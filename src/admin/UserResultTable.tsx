// src/user/UserResultTable.tsx
import React, { useEffect, useState } from "react";
import { apiClient } from "../apiConfig";

const SUMMARY_API = "/api/game-entries/summary";
const TOTALS_API = "/api/totals";
const LOGINS_API = "/api/logins";
const COIN_VALUE = 0.15;

// helper to avoid NaN
const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

interface UserResultTableProps {
  username: string;
}

interface PaymentTotals {
  cashapp: number;
  paypal: number;
  chime: number;
}

interface LoginHistoryItem {
  userName?: string;
  username?: string;
  userEmail?: string;
  loginTime?: string; // ISO string
  signInAt?: string; // from /api/logins
}

interface EntrySummary {
  username: string;
  totalDeposit: number;
  totalFreeplay: number;
  totalRedeem: number;
}

const UserResultTable: React.FC<UserResultTableProps> = ({ username }) => {
  const [summary, setSummary] = useState<EntrySummary>({
    username,
    totalDeposit: 0,
    totalFreeplay: 0,
    totalRedeem: 0,
  });
  const [totals, setTotals] = useState<PaymentTotals>({
    cashapp: 0,
    paypal: 0,
    chime: 0,
  });
  const [signins, setSignins] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!username) return;
    try {
      setLoading(true);

      const [summaryRes, totalsRes, loginsRes] = await Promise.all([
        apiClient.get<EntrySummary>(SUMMARY_API, {
          params: { username },
        }),
        apiClient.get(TOTALS_API),
        apiClient.get<LoginHistoryItem[]>(
          `${LOGINS_API}?username=${encodeURIComponent(username)}`
        ),
      ]);

      // 🎯 coins from GameEntry summary
      if (summaryRes.data) {
        const s = summaryRes.data;
        setSummary({
          username: s.username,
          totalDeposit: safeNumber(s.totalDeposit),
          totalFreeplay: safeNumber(s.totalFreeplay),
          totalRedeem: safeNumber(s.totalRedeem),
        });
      }

      // 💵 payments from /api/totals
      if (totalsRes.data && typeof totalsRes.data === "object") {
        setTotals({
          cashapp: safeNumber(totalsRes.data.cashapp),
          paypal: safeNumber(totalsRes.data.paypal),
          chime: safeNumber(totalsRes.data.chime),
        });
      }

      // 🔑 sign-in count from /api/logins
      if (Array.isArray(loginsRes.data)) {
        setSignins(loginsRes.data.length);
      }
    } catch (err) {
      console.error("Failed to load user result data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const { totalDeposit, totalFreeplay, totalRedeem } = summary;

  const totalPaymentsUsd =
    safeNumber(totals.cashapp) +
    safeNumber(totals.paypal) +
    safeNumber(totals.chime);

  const formatCurrency = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800">
          Summary for {username}
        </h2>
        <button
          onClick={loadData}
          className="text-xs px-3 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-2 text-left">Metric</th>
              <th className="px-4 py-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="px-4 py-2 text-gray-700">Total Sign-ins</td>
              <td className="px-4 py-2 text-right font-semibold">
                {loading ? "..." : signins}
              </td>
            </tr>

            <tr>
              <td className="px-4 py-2 text-gray-700">Total Deposit (coins)</td>
              <td className="px-4 py-2 text-right font-semibold text-indigo-600">
                {loading ? "..." : totalDeposit.toLocaleString()}{" "}
                <span className="ml-1 text-[11px] text-slate-400">
                  ({formatCurrency(totalDeposit * COIN_VALUE)})
                </span>
              </td>
            </tr>

            <tr>
              <td className="px-4 py-2 text-gray-700">
                Total Freeplay (coins)
              </td>
              <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                {loading ? "..." : totalFreeplay.toLocaleString()}{" "}
                <span className="ml-1 text-[11px] text-slate-400">
                  ({formatCurrency(totalFreeplay * COIN_VALUE)})
                </span>
              </td>
            </tr>

            <tr>
              <td className="px-4 py-2 text-gray-700">Total Redeem (coins)</td>
              <td className="px-4 py-2 text-right font-semibold text-red-600">
                {loading ? "..." : totalRedeem.toLocaleString()}{" "}
                <span className="ml-1 text-[11px] text-slate-400">
                  ({formatCurrency(totalRedeem * COIN_VALUE)})
                </span>
              </td>
            </tr>

            <tr>
              <td className="px-4 py-2 text-gray-700">Total Payments (USD)</td>
              <td className="px-4 py-2 text-right font-semibold text-gray-800">
                {loading ? "..." : formatCurrency(totalPaymentsUsd)}
                <span className="ml-1 text-[11px] text-slate-400">
                  (CashApp + PayPal + Chime)
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {loading && (
        <p className="mt-2 text-xs text-slate-400">
          Loading summary, please wait...
        </p>
      )}
    </div>
  );
};

export default UserResultTable;
