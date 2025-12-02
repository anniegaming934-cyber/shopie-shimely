import React, { useEffect, useState, type FC } from "react";
import {
  TrendingUp,
  TrendingDown,
  Gamepad,
  Edit,
  Save,
  X,
  RotateCcw,
  Trash2,
  Clock3, // ⬅ NEW: history icon
} from "lucide-react";
import { apiClient } from "../apiConfig";
import GameRechargeHistory from "./GameRechargeHistory"; // ⬅ NEW: history table component

export interface Game {
  id: number;
  name: string;

  // kept for compatibility (not used in this row calc)
  coinsSpent?: number;
  coinsEarned?: number;

  coinsRecharged: number; // coin top-up (editable)
  lastRechargeDate?: string; // editable with recharge
  totalCoins?: number; // optional, from backend
}

interface GameRowProps {
  game: Game;
  coinValue: number;
  isEditing: boolean;
  onEditStart: (id: number) => void;

  // Keep signature for compatibility; we pass 0 for spent/redeem
  onUpdate: (
    id: number,
    spentChange: number,
    earnedChange: number,
    rechargeChange: number,
    totalCoinsAfter: number,
    rechargeDateISO?: string
  ) => void;

  onCancel: () => void;
  onDelete: (id: number) => void;

  // NEW: reset just the recharge fields
  onResetRecharge: (id: number) => void;
}

const formatCurrency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const toTodayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const GameRow: FC<GameRowProps> = ({
  game,
  coinValue,
  isEditing,
  onEditStart,
  onUpdate,
  onCancel,
  onDelete,
  onResetRecharge,
}) => {
  // Only edit recharge + date
  const [rechargeStr, setRechargeStr] = useState<string>("");
  const [rechargeDateISO, setRechargeDateISO] = useState<string>(
    game.lastRechargeDate || toTodayISO()
  );

  // 🔢 Net total coins from /api/game-entries for this game
  //   freeplay + deposit  → subtract
  //   redeem              → add
  const [totalFromEntries, setTotalFromEntries] = useState<number>(0);
  const [loadingEntries, setLoadingEntries] = useState<boolean>(false);

  // ⬅ NEW: toggle for showing recharge history table
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const inputBox =
    "w-full p-2 text-sm border border-gray-700 rounded-md bg-[#0b1222] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const toNonNegNumber = (s: string) => {
    if (!s) return 0;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };

  // 🧮 Load totals from /api/game-entries for this game
  useEffect(() => {
    const loadTotals = async () => {
      try {
        setLoadingEntries(true);
        const { data } = await apiClient.get("/api/game-entries", {
          params: { gameName: game.name },
        });

        const entries = Array.isArray(data) ? data : [];

        // totalCoin starts at 0
        // deposit/freeplay → subtract amountFinal
        // redeem           → add amountFinal
        const netTotal = entries.reduce((acc: number, e: any) => {
          const t = String(e.type || "").toLowerCase();
          const amtRaw = e.amountFinal ?? e.amount ?? 0;
          const amt = Number(amtRaw);
          if (!Number.isFinite(amt) || amt <= 0) return acc;

          if (t === "deposit" || t === "freeplay") {
            return acc - amt;
          }
          if (t === "redeem") {
            return acc + amt;
          }
          return acc;
        }, 0);

        setTotalFromEntries(netTotal);
      } catch (err) {
        console.error(
          "Failed to load game entry totals for game:",
          game.name,
          err
        );
        setTotalFromEntries(0);
      } finally {
        setLoadingEntries(false);
      }
    };

    loadTotals();
  }, [game.name]);

  // Total coins displayed (from backend aggregated totals)
  const totalCoinValue =
    typeof game.totalCoins === "number" ? game.totalCoins : 0;

  const pnl = totalCoinValue * coinValue;
  const isProfit = pnl >= 0;

  const pnlClass = isProfit
    ? "text-emerald-600 bg-emerald-100"
    : "text-red-600 bg-red-100";
  const PnlIcon = isProfit ? TrendingUp : TrendingDown;

  const handleLogTransaction = () => {
    const rechargeChange = toNonNegNumber(rechargeStr);
    if (!Number.isFinite(rechargeChange)) return;

    const dateOrUndefined =
      rechargeChange > 0 ? rechargeDateISO || toTodayISO() : undefined;

    const newCoinsRecharged = (game.coinsRecharged || 0) + rechargeChange;

    // totalCoinsAfter = current net from entries + updated recharge
    const totalCoinsAfter = Math.abs(totalFromEntries + newCoinsRecharged);

    onUpdate(game.id, 0, 0, rechargeChange, totalCoinsAfter, dateOrUndefined);

    setRechargeStr("");
    onCancel();
  };

  const invalid = !Number.isFinite(toNonNegNumber(rechargeStr));

  // ===== Modal: only Coin Recharged + Date =====
  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] text-gray-100 shadow-2xl">
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition"
              title="Close"
            >
              <X size={18} className="text-gray-300" />
            </button>

            <div className="flex justify-center -mt-6">
              <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
                <Gamepad className="text-indigo-400" size={20} />
              </div>
            </div>

            <div className="px-6 pt-6 pb-5 text-center">
              <h2 className="text-lg font-semibold">Update Coin Recharge</h2>
              <p className="mt-1 text-sm text-gray-400">
                <span className="font-medium text-gray-200">{game.name}</span>
              </p>

              <div className="mt-5 space-y-3 text-left">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Coin Recharged
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rechargeStr}
                    onChange={(e) => setRechargeStr(e.target.value)}
                    className={inputBox}
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Recharge Date
                  </label>
                  <input
                    type="date"
                    value={rechargeDateISO}
                    onChange={(e) => setRechargeDateISO(e.target.value)}
                    className={inputBox}
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={handleLogTransaction}
                  disabled={invalid}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 transition"
                >
                  <Save size={16} className="mr-2" />
                  Save
                </button>

                <button
                  onClick={onCancel}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/10 hover:bg-white/15 transition"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </button>
              </div>

              <div className="mt-3">
                <button
                  onClick={() => onResetRecharge(game.id)}
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 transition border border-red-500/40"
                  title="Reset recharge (sets to 0 and clears date)"
                >
                  <RotateCcw size={14} className="mr-2" />
                  Reset Recharge
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const nameCell = (
    <div className="flex items-center space-x-3">
      <Gamepad size={20} className="text-indigo-500 hidden md:block" />
      <span className="font-semibold text-gray-800 truncate">{game.name}</span>
    </div>
  );

  return (
    <>
      {/* Main row */}
      <div className="grid grid-cols-12 gap-4 py-4 px-4 hover:bg-gray-50 transition duration-150 border-b border-gray-200">
        {/* Game name */}
        <div className="col-span-4">{nameCell}</div>

        {/* Coins recharged */}
        <div className="col-span-2 text-sm text-gray-700">
          <span className="font-mono text-blue-600">
            {game.coinsRecharged.toLocaleString()}
          </span>
        </div>

        {/* Last recharge date */}
        <div className="col-span-2 text-sm text-gray-700">
          <span className="text-[12px] text-gray-600">
            {game.lastRechargeDate || "—"}
          </span>
        </div>

        {/* Total coins (from backend aggregation) */}
        <div className="col-span-2 text-sm">
          <span
            className={`font-mono ${
              totalCoinValue < 0
                ? "text-red-700"
                : totalCoinValue > 0
                ? "text-green-700"
                : "text-gray-500"
            }`}
          >
            {loadingEntries ? "…" : totalCoinValue.toLocaleString()}
          </span>
        </div>

        {/* PnL + actions */}
        <div className="col-span-2 text-sm flex items-center justify-end space-x-2">
          <span
            className={`px-2 py-1 rounded-full text-xs font-bold flex items-center ${pnlClass} w-24 justify-center`}
          >
            <PnlIcon size={14} className="mr-1" />
            {formatCurrency(pnl)}
          </span>

          {/* NEW: history toggle */}
          <button
            onClick={() => setShowHistory((prev) => !prev)}
            className="p-1 text-slate-600 hover:text-slate-800 transition duration-150 rounded-full hover:bg-slate-100"
            title="View recharge history"
          >
            <Clock3 size={16} />
          </button>

          <button
            onClick={() => onResetRecharge(game.id)}
            className="p-1 text-amber-600 hover:text-amber-700 transition duration-150 rounded-full hover:bg-amber-100"
            title="Reset recharge"
          >
            <RotateCcw size={16} />
          </button>

          <button
            onClick={() => onDelete(game.id)}
            className="p-1 text-red-500 hover:text-red-700 transition duration-150 rounded-full hover:bg-red-100"
            title="Delete game"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Separate history table row */}
      {showHistory && (
        <div className="px-4 pb-4 border-b border-gray-200 bg-gray-50">
          <GameRechargeHistory gameId={game.id} />
        </div>
      )}
    </>
  );
};

export default GameRow;
