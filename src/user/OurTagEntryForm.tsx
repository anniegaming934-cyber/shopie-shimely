// src/OurTagEntryForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../apiConfig";
import { type EntryType } from "./RecentEntriesTable";
import toast from "react-hot-toast";
import { showToast } from "../Toast";

// ✅ make sure EntryType in RecentEntriesTable is:
// export type EntryType = "freeplay" | "deposit" | "redeem" | "playedgame";

const types: EntryType[] = ["freeplay", "deposit", "redeem", "playedgame"];

const methods = ["cashapp", "paypal", "chime", "venmo"] as const;
type PaymentMethod = (typeof methods)[number];

const GAMES_API_PATH = "/api/games";

const getToday = () => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function useDebounce<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface OurTagEntryFormProps {
  username: string;
}

const OurTagEntryForm: React.FC<OurTagEntryFormProps> = ({ username }) => {
  const [type, setType] = useState<EntryType>("deposit");
  const [isCashIn, setIsCashIn] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("cashapp");

  const [playerName, setPlayerName] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getToday());
  const [bonusRate, setBonusRate] = useState<number>(10);

  // pending + tag
  const [isPending, setIsPending] = useState(false);
  const [pendingPlayerTag, setPendingPlayerTag] = useState("");

  // multi game selection
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [amountsByGame, setAmountsByGame] = useState<Record<string, string>>(
    {}
  );
  const [gameQuery, setGameQuery] = useState("");

  // cache names per type
  const [namesByType, setNamesByType] = useState<Record<EntryType, string[]>>({
    freeplay: [],
    deposit: [],
    redeem: [],
    playedgame: [],
  });

  const debouncedGameQuery = useDebounce(gameQuery, 250);
  const [gameOptions, setGameOptions] = useState<string[]>([]);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const gameInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // totalCoins per game from /api/games
  const [gameTotals, setGameTotals] = useState<Record<string, number>>({});

  const [totalPaidInput, setTotalPaidInput] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // ✅ method is required only for deposit + redeem
  const needsMethod = type !== "freeplay" && type !== "playedgame";

  // ✅ Cash flow buttons disabled for freeplay + playedgame
  const flowDisabled = type === "freeplay" || type === "playedgame";

  // ===== helpers =====
  function setFlow(cashin: boolean) {
    setIsCashIn(cashin);
    // Cash flow buttons explicitly switch between deposit/redeem
    // but NOT when freeplay/playedgame
    if (type === "freeplay" || type === "playedgame") return;
    setType(cashin ? "deposit" : "redeem");
  }

  const parseAmount = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ✅ deposit + playedgame share bonus behavior
  const perGameCalc = useMemo(() => {
    const hasBonus = type === "deposit" || type === "playedgame";

    return selectedGames.reduce((acc, g) => {
      const base = parseAmount(amountsByGame[g] || "");
      const bonus = hasBonus && base > 0 ? (base * bonusRate) / 100 : 0;
      const finalAmt = hasBonus ? base + bonus : base;
      acc[g] = { base, bonus, finalAmt };
      return acc;
    }, {} as Record<string, { base: number; bonus: number; finalAmt: number }>);
  }, [selectedGames, amountsByGame, bonusRate, type]);

  const totalCashout = useMemo(() => {
    if (type !== "redeem") return 0;
    return selectedGames.reduce(
      (sum, g) => sum + (perGameCalc[g]?.finalAmt || 0),
      0
    );
  }, [type, selectedGames, perGameCalc]);

  const totalPaid = useMemo(
    () => Number(totalPaidInput) || 0,
    [totalPaidInput]
  );

  const remainingPay = useMemo(() => {
    if (type !== "redeem") return 0;
    const rem = totalCashout - totalPaid;
    return rem > 0 ? rem : 0;
  }, [type, totalPaid, totalCashout]);

  const canSubmit = useMemo(() => {
    if (!username.trim()) return false;
    if (!playerName.trim()) return false;
    if (needsMethod && !method) return false;
    if (selectedGames.length === 0) return false;

    for (const g of selectedGames) {
      const base = parseAmount(amountsByGame[g] || "");
      const totalCoinsForGame = gameTotals[g] ?? 0;

      if (totalCoinsForGame <= 0) return false;
      if (!(base > 0)) return false;
    }

    if (type === "redeem" && isPending && !pendingPlayerTag.trim()) {
      return false;
    }
    return true;
  }, [
    username,
    playerName,
    needsMethod,
    method,
    selectedGames,
    amountsByGame,
    type,
    isPending,
    pendingPlayerTag,
    gameTotals,
  ]);

  // ===== Effects =====

  // keep flow in sync with type (for button highlight only)
  useEffect(() => {
    if (type === "freeplay") return;
    // treat playedgame as "cash in" visually
    setIsCashIn(type === "deposit" || type === "playedgame");
  }, [type]);

  // Load totalCoins per game
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get(GAMES_API_PATH);
        const map: Record<string, number> = {};

        if (Array.isArray(data)) {
          (data as any[]).forEach((g) => {
            const name = String(g?.name || "").trim();
            if (!name) return;
            const total = Number(g?.totalCoins ?? 0);
            map[name] = Number.isFinite(total) ? total : 0;
          });
        }

        if (!cancelled) {
          setGameTotals(map);
        }
      } catch (err) {
        console.error("Failed to load game totals:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Prefetch names by type
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (namesByType[type]?.length) return;
      try {
        const { data } = await apiClient.get(GAMES_API_PATH, {
          params: { type },
        });
        const list: string[] = Array.isArray(data)
          ? typeof data[0] === "string"
            ? (data as string[])
            : (data as any[]).map((g) => String(g?.name || "")).filter(Boolean)
          : [];
        const unique = Array.from(new Set(list)).sort((a, b) =>
          a.localeCompare(b)
        );
        if (!cancelled) setNamesByType((old) => ({ ...old, [type]: unique }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, namesByType]);

  // Suggestions on typing
  useEffect(() => {
    const q = debouncedGameQuery.trim();
    if (!q) {
      const cached = namesByType[type] || [];
      const available = cached.filter((n) => !selectedGames.includes(n));
      setGameOptions(available.slice(0, 10));
      setGamesOpen(available.length > 0);
      setHighlightIndex(available.length ? 0 : -1);
      return;
    }
    let cancelled = false;
    (async () => {
      setGamesLoading(true);
      setGamesError(null);
      try {
        const { data } = await apiClient.get<string[] | any[]>(GAMES_API_PATH, {
          params: { q, type },
        });
        let names: string[] = [];
        if (Array.isArray(data)) {
          names =
            typeof data[0] === "string"
              ? (data as string[])
              : (data as any[]).map((g) => g.name).filter(Boolean);
        }
        const local = namesByType[type] || [];
        const union = Array.from(new Set([...names, ...local]))
          .filter(
            (n) =>
              n.toLowerCase().includes(q.toLowerCase()) &&
              !selectedGames.includes(n)
          )
          .slice(0, 10);

        if (!cancelled) {
          setGameOptions(union);
          setGamesOpen(union.length > 0);
          setHighlightIndex(union.length ? 0 : -1);
        }
      } catch {
        const local = (namesByType[type] || [])
          .filter(
            (n) =>
              n.toLowerCase().includes(q.toLowerCase()) &&
              !selectedGames.includes(n)
          )
          .slice(0, 10);
        if (!cancelled) {
          setGameOptions(local);
          setGamesOpen(local.length > 0);
          setHighlightIndex(local.length ? 0 : -1);
        }
      } finally {
        if (!cancelled) setGamesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedGameQuery, type, namesByType, selectedGames]);

  // click-outside to close
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        gameInputRef.current &&
        !gameInputRef.current.contains(e.target as Node)
      ) {
        setGamesOpen(false);
        setHighlightIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ===== token helpers =====
  function addGameToken(raw: string) {
    const name = raw.trim();
    if (!name) return;
    if (selectedGames.includes(name)) return;
    setSelectedGames((prev) => {
      const next = [...prev, name].sort((a, b) => a.localeCompare(b));
      return next;
    });
    setAmountsByGame((prev) => ({ ...prev, [name]: "" }));
    setGameQuery("");
  }

  function removeGameToken(name: string) {
    setSelectedGames((prev) => prev.filter((g) => g !== name));
    setAmountsByGame((prev) => {
      const c = { ...prev };
      delete c[name];
      return c;
    });
  }

  function chooseGame(name: string) {
    addGameToken(name);
    setGamesOpen(false);
    setHighlightIndex(-1);
  }

  function onGameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addGameToken(gameQuery);
      return;
    }
    if (!gamesOpen || gameOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % gameOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(
        (i) => (i - 1 + gameOptions.length) % gameOptions.length
      );
    } else if (e.key === "Tab") {
      if (highlightIndex >= 0 && gameOptions[highlightIndex]) {
        e.preventDefault();
        chooseGame(gameOptions[highlightIndex]);
      }
    }
  }

  function applyFirstToAll() {
    const first = selectedGames[0];
    if (!first) return;
    const val = amountsByGame[first] || "";
    const next: Record<string, string> = {};
    selectedGames.forEach((g) => (next[g] = val));
    setAmountsByGame(next);
  }

  // ===== submit =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!canSubmit) {
      const msg = "Please fill all required fields correctly.";
      setError(msg);
      showToast.error(msg);
      return;
    }

    const loadingToast = showToast.loading("Saving entry...");
    setSaving(true);

    try {
      const gamesToSave = [...selectedGames];
      const hasBonus = type === "deposit" || type === "playedgame";

      await Promise.all(
        gamesToSave.map((gname) => {
          const calc = perGameCalc[gname] || {
            base: 0,
            bonus: 0,
            finalAmt: 0,
          };
          const base = calc.base;
          const bonus = calc.bonus;
          const finalAmt = calc.finalAmt;

          return apiClient.post("/api/game-entries", {
            type, // "freeplay" | "deposit" | "redeem" | "playedgame"
            method: needsMethod ? method : undefined,

            username: username.trim(),
            createdBy: username.trim(),

            playerName: playerName.trim(),
            playerTag:
              type === "redeem" && isPending && pendingPlayerTag.trim()
                ? pendingPlayerTag.trim()
                : undefined,

            gameName: gname,

            amountBase: Number(base),
            bonusRate: hasBonus ? Number(bonusRate) : 0,
            bonusAmount: hasBonus ? Number(bonus) : 0,
            amountFinal: Number(finalAmt),
            amount: Number(finalAmt),

            note: note.trim() || undefined,
            date: date || undefined,

            totalPaid: type === "redeem" ? Number(totalPaid) || 0 : undefined,
            totalCashout:
              type === "redeem" ? Number(totalCashout) || 0 : undefined,
            remainingPay:
              type === "redeem" ? Number(remainingPay) || 0 : undefined,

            isPending: type === "redeem" ? isPending : undefined,
          });
        })
      );

      const successMsg = "Entry saved successfully!";
      setOk(successMsg);
      showToast.success(successMsg);

      // reset form
      setType("deposit");
      setFlow(true);
      setMethod("cashapp");
      setPlayerName("");
      setSelectedGames([]);
      setAmountsByGame({});
      setGameQuery("");
      setBonusRate(10);
      setTotalPaidInput("");
      setIsPending(false);
      setPendingPlayerTag("");
      setNote("");
      setDate(getToday());
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Save failed. Please try again.";
      console.error("Save failed:", err?.response?.data || err.message || err);
      setError(msg);
      showToast.error(msg);
    } finally {
      setSaving(false);
      toast.dismiss(loadingToast);
    }
  };

  return (
    <>
      {/* Remaining paying headline for OUR TAG (redeem + pending + tag) */}
      {type === "redeem" &&
        isPending &&
        pendingPlayerTag.trim() &&
        remainingPay > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Remaining paying for{" "}
            <span className="font-semibold">{pendingPlayerTag.trim()}</span>:{" "}
            <span className="font-semibold">{remainingPay.toFixed(2)}</span>
          </div>
        )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => {
              const v = e.target.value as EntryType;
              setType(v); // just set type; cashflow handled separately
              if (v !== "redeem") {
                setIsPending(false);
                setPendingPlayerTag("");
              }
            }}
            className="w-full rounded-lg border px-3 py-2"
            required
          >
            {types.map((t) => (
              <option key={t} value={t}>
                {t === "playedgame"
                  ? "Played Game"
                  : t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Method (hidden for freeplay + playedgame) */}
        {needsMethod && (
          <div>
            <label className="block text-sm font-medium mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              className="w-full rounded-lg border px-3 py-2"
              required={needsMethod}
            >
              {methods.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Cash Flow */}
        <div className="md:col-span-1 flex items-end md:justify-end">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium mb-1">Cash Flow</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFlow(true)}
                disabled={flowDisabled}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition
                  ${
                    isCashIn
                      ? "bg-emerald-500 text-white border-emerald-600"
                      : "bg-white text-emerald-600 border-emerald-300"
                  }
                  ${flowDisabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                Cash In
              </button>
              <button
                type="button"
                onClick={() => setFlow(false)}
                disabled={flowDisabled}
                className={`px-3 py-2 rounded-lg border text-sm font-semibold transition
                  ${
                    !isCashIn
                      ? "bg-red-500 text-white border-red-600"
                      : "bg-white text-red-600 border-red-300"
                  }
                  ${flowDisabled ? "opacity-50 cursor-not-allowed" : ""}
                `}
              >
                Cash Out
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cash In = Deposit · Cash Out = Redeem
            </p>
          </div>
        </div>

        {/* Player Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Player Name</label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. John"
            className="w-full rounded-lg border px-3 py-2"
            required
          />
        </div>

        {/* Game Names + tokens */}
        <div className="md:col-span-3" ref={dropdownRef}>
          <label className="block text-sm font-medium mb-1">Game Name(s)</label>

          {selectedGames.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedGames.map((g) => {
                const totalCoinsForGame = gameTotals[g] ?? 0;
                return (
                  <span
                    key={g}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs bg-slate-100 border border-slate-200"
                  >
                    {g}
                    <span className="text-[10px] text-slate-500">
                      ({totalCoinsForGame.toFixed(2)} coins)
                    </span>
                    <button
                      type="button"
                      onClick={() => removeGameToken(g)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="relative">
            <input
              ref={gameInputRef}
              value={gameQuery}
              onChange={(e) => {
                setGameQuery(e.target.value);
                setGamesOpen(true);
              }}
              onFocus={() => {
                const cached = (namesByType[type] || []).filter(
                  (n) => !selectedGames.includes(n)
                );
                setGameOptions(cached.slice(0, 10));
                setGamesOpen(cached.length > 0);
              }}
              onKeyDown={onGameKeyDown}
              placeholder="Type and press Enter or comma to add"
              className="w-full rounded-lg border px-3 py-2"
            />

            {gamesOpen && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-60 overflow-auto">
                {gamesLoading && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    Loading…
                  </div>
                )}
                {gamesError && (
                  <div className="px-3 py-2 text-sm text-red-600">
                    {gamesError}
                  </div>
                )}
                {!gamesLoading &&
                  !gamesError &&
                  gameOptions.map((opt, i) => (
                    <button
                      type="button"
                      key={opt + i}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        i === highlightIndex ? "bg-gray-100" : ""
                      }`}
                      onMouseEnter={() => setHighlightIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        chooseGame(opt);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Per-game Amounts */}
        {selectedGames.length > 0 && (
          <div className="md:col-span-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold">
                Amounts per Game
              </label>
              <button
                type="button"
                onClick={applyFirstToAll}
                className="text-sm underline"
              >
                Apply first amount to all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedGames.map((g) => {
                const calc = perGameCalc[g] || {
                  base: 0,
                  bonus: 0,
                  finalAmt: 0,
                };

                const totalCoinsForGame = gameTotals[g] ?? 0;
                const notEnough = totalCoinsForGame <= 0;

                return (
                  <div key={g} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">{g}</div>
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => removeGameToken(g)}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="block text-xs text-slate-600 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amountsByGame[g] ?? ""}
                      onChange={(e) =>
                        setAmountsByGame((prev) => ({
                          ...prev,
                          [g]: e.target.value,
                        }))
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border px-3 py-2"
                      required
                      disabled={notEnough}
                    />

                    {notEnough && (
                      <p className="text-[11px] text-red-600 mt-1">
                        Not enough amount to recharge for this game. (Total
                        coins: {totalCoinsForGame.toFixed(2)})
                      </p>
                    )}

                    {(type === "deposit" || type === "playedgame") &&
                      !notEnough && (
                        <p className="text-[11px] text-slate-600 mt-2">
                          Bonus: {calc.bonus.toFixed(2)} · Final:{" "}
                          {calc.finalAmt.toFixed(2)}
                        </p>
                      )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bonus for deposit & playedgame */}
        {(type === "deposit" || type === "playedgame") && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Bonus (%)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={bonusRate}
              onChange={(e) => setBonusRate(Number(e.target.value) || 0)}
              className="w-full rounded-lg border px-3 py-2"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Applied per game. Bonus = amount × rate / 100
            </p>
          </div>
        )}

        {/* Cashout totals for REDEEM */}
        {type === "redeem" && (
          <>
            {/* Total Cost */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">
                Total Cost
              </label>
              <input
                value={totalCashout.toFixed(2)}
                readOnly
                className="w-full rounded-lg border px-3 py-2 bg-gray-50"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Sum of all game final amounts for this redeem.
              </p>
            </div>

            {/* Total Paid */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">
                Total Paid (optional)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={totalPaidInput}
                onChange={(e) => setTotalPaidInput(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Leave blank or 0 if nothing has been paid yet.
              </p>
            </div>

            {/* Remaining Pay */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-1">
                Remaining Pay
              </label>
              <input
                value={remainingPay.toFixed(2)}
                readOnly
                className="w-full rounded-lg border px-3 py-2 bg-gray-50"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Remaining = Total Cost − Total Paid
              </p>
            </div>

            {/* Pending toggle + Player Tag */}
            <div className="md:col-span-1 flex flex-col justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPending}
                  onChange={(e) => setIsPending(e.target.checked)}
                />
                <span>Mark as Pending</span>
              </label>

              {isPending && (
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Player Tag (for this pending)
                  </label>
                  <input
                    value={pendingPlayerTag}
                    onChange={(e) => setPendingPlayerTag(e.target.value)}
                    placeholder="@player123"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Note */}
        <div className="md:col-span-3">
          <label className="block text-sm font-medium mb-1">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="optional note"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Submit */}
        <div className="md:col-span-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50 w-full md:w-auto"
          >
            {saving ? "Saving..." : "Save Entry"}
          </button>
          {ok && <span className="text-green-600 text-sm">{ok}</span>}
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </form>
    </>
  );
};

export default OurTagEntryForm;
