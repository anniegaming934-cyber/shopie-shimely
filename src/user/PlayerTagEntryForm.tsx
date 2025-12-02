// src/PlayerTagEntryForm.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../apiConfig";

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

function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface PlayerTagEntryFormProps {
  username: string;
}

const PlayerTagEntryForm: React.FC<PlayerTagEntryFormProps> = ({
  username,
}) => {
  const [method, setMethod] = useState<PaymentMethod>("cashapp");
  const [playerName, setPlayerName] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(getToday());

  // PLAYER TAG MODE specific state
  const [ptPlayerTag, setPtPlayerTag] = useState("");
  const [ptGameName, setPtGameName] = useState("");
  const [ptAmount, setPtAmount] = useState("");
  const [ptCashoutAmount, setPtCashoutAmount] = useState("");

  const [extraMoneyEnabled, setExtraMoneyEnabled] = useState(false);
  const [extraMoney, setExtraMoney] = useState("");

  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [tagLookupLoading, setTagLookupLoading] = useState(false);
  const [tagLookupError, setTagLookupError] = useState<string | null>(null);

  // 🔹 unified pending info: redeem + reduction
  const [tagPendingInfo, setTagPendingInfo] = useState<{
    playerTag: string;
    totalPending: number;
    pendingRedeem: number;
    pendingReduction: number;
  } | null>(null);

  const [tagOptions, setTagOptions] = useState<string[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagHighlightIndex, setTagHighlightIndex] = useState(-1);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const debouncedPlayerTag = useDebounce(ptPlayerTag, 300);

  // Game name autocomplete (single game)
  const [allGameNames, setAllGameNames] = useState<string[]>([]);
  const [gameOptions, setGameOptions] = useState<string[]>([]);
  const [gameDropdownOpen, setGameDropdownOpen] = useState(false);
  const [gameHighlightIndex, setGameHighlightIndex] = useState(-1);
  const gameInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // 🔸 Reduction = Cashout Amount − Deposit Amount (automatic)
  // Example: pending/cashout = 100, deposit = 40 → reduction = 60
  const ptReduction = useMemo(() => {
    const dep = Number(ptAmount) || 0;
    const cashout = Number(ptCashoutAmount) || 0;
    const diff = cashout - dep;
    return diff > 0 ? diff : 0;
  }, [ptAmount, ptCashoutAmount]);

  const canSubmit = useMemo(() => {
    if (!username.trim()) return false;
    if (!ptPlayerTag.trim()) return false;
    if (!ptGameName.trim()) return false;
    if (!method) return false;
    if (!(Number(ptAmount) > 0)) return false;
    if (extraMoneyEnabled && !(Number(extraMoney) > 0)) return false;
    return true;
  }, [
    username,
    ptPlayerTag,
    ptGameName,
    method,
    ptAmount,
    extraMoneyEnabled,
    extraMoney,
  ]);

  // Load all pending tags for this user (for suggestions)
  useEffect(() => {
    if (!username.trim()) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/game-entries/pending", {
          params: { username: username.trim() },
        });
        if (cancelled) return;
        const tags = Array.from(
          new Set(
            (Array.isArray(data) ? data : [])
              .map((e: any) => String(e.playerTag || "").trim())
              .filter((t) => t.length > 0)
          )
        );
        setPendingTags(tags);
      } catch (err) {
        console.error("Failed to load pending tags:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  // Load all game names (for suggestions)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get(GAMES_API_PATH);
        let names: string[] = [];
        if (Array.isArray(data)) {
          names =
            typeof data[0] === "string"
              ? (data as string[])
              : (data as any[])
                  .map((g) => String(g?.name || "").trim())
                  .filter(Boolean);
        }
        const unique = Array.from(new Set(names)).sort((a, b) =>
          a.localeCompare(b)
        );
        if (!cancelled) {
          setAllGameNames(unique);
        }
      } catch (err) {
        console.error("Failed to load games for player mode:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 🔹 lookup unified pending (redeem - reduction) for a tag
  const lookupPendingForTag = async (tag: string, user: string) => {
    const cleanTag = tag.trim();
    if (!cleanTag || !user.trim()) {
      setTagPendingInfo(null);
      setTagLookupError(null);
      return;
    }
    try {
      setTagLookupLoading(true);
      setTagLookupError(null);

      const { data } = await apiClient.get("/api/game-entries/pending-by-tag", {
        params: {
          playerTag: cleanTag,
          username: user.trim(),
        },
      });

      // BACKEND returns (latest version):
      // remainingPay      → combined pending (redeem - reduction)
      // pendingRedeem     → only redeem
      // pendingReduction  → only reduction
      const totalPending = Number(
        (data?.remainingPay ?? data?.totalPending ?? 0) as number
      );
      const pendingRedeem = Number(data?.pendingRedeem ?? 0);
      const pendingReduction = Number(data?.pendingReduction ?? 0);

      const info = {
        playerTag: data?.playerTag || cleanTag,
        totalPending,
        pendingRedeem,
        pendingReduction,
      };
      setTagPendingInfo(info);

      // ✅ auto-fill cashout amount with combined pending
      if (totalPending > 0) {
        setPtCashoutAmount(totalPending.toString());
      }
    } catch (err: any) {
      console.error(
        "pending-by-tag lookup failed:",
        err?.response?.data || err
      );
      if (err?.response?.status === 404) {
        setTagPendingInfo(null);
        setTagLookupError(null);
      } else {
        setTagPendingInfo(null);
        setTagLookupError(
          err?.response?.data?.message ||
            "Failed to lookup pending info for this tag."
        );
      }
    } finally {
      setTagLookupLoading(false);
    }
  };

  // when playerTag changes (debounced), lookup pending
  useEffect(() => {
    if (!debouncedPlayerTag.trim() || !username.trim()) {
      setTagPendingInfo(null);
      setTagLookupError(null);
      return;
    }
    lookupPendingForTag(debouncedPlayerTag, username);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPlayerTag, username]);

  // suggestions dropdown for player tag
  function updateTagOptions(value: string) {
    const q = value.trim().toLowerCase();
    if (!q) {
      const base = pendingTags.slice(0, 10);
      setTagOptions(base);
      setTagDropdownOpen(base.length > 0);
      setTagHighlightIndex(base.length ? 0 : -1);
      return;
    }
    const filtered = pendingTags
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 10);
    setTagOptions(filtered);
    setTagDropdownOpen(filtered.length > 0);
    setTagHighlightIndex(filtered.length ? 0 : -1);
  }

  function chooseTag(tag: string) {
    setPtPlayerTag(tag);
    setTagDropdownOpen(false);
    setTagHighlightIndex(-1);
    // lookup triggered by debounced effect via ptPlayerTag
  }

  function onTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!tagDropdownOpen || tagOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setTagHighlightIndex((i) => (i + 1) % tagOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setTagHighlightIndex(
        (i) => (i - 1 + tagOptions.length) % tagOptions.length
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (tagHighlightIndex >= 0 && tagOptions[tagHighlightIndex]) {
        e.preventDefault();
        chooseTag(tagOptions[tagHighlightIndex]);
      }
    }
  }

  // game name suggestions
  function updateGameOptions(value: string) {
    const q = value.trim().toLowerCase();
    if (!q) {
      const base = allGameNames.slice(0, 10);
      setGameOptions(base);
      setGameDropdownOpen(base.length > 0);
      setGameHighlightIndex(base.length ? 0 : -1);
      return;
    }
    const filtered = allGameNames
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 10);
    setGameOptions(filtered);
    setGameDropdownOpen(filtered.length > 0);
    setGameHighlightIndex(filtered.length ? 0 : -1);
  }

  function chooseGame(name: string) {
    setPtGameName(name);
    setGameDropdownOpen(false);
    setGameHighlightIndex(-1);
  }

  function onGameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!gameDropdownOpen || gameOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setGameHighlightIndex((i) => (i + 1) % gameOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setGameHighlightIndex(
        (i) => (i - 1 + gameOptions.length) % gameOptions.length
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (gameHighlightIndex >= 0 && gameOptions[gameHighlightIndex]) {
        e.preventDefault();
        chooseGame(gameOptions[gameHighlightIndex]);
      }
    }
  }

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!canSubmit) {
      setError("Please fill all required fields correctly.");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/api/game-entries", {
        type: "deposit",
        method,

        username: username.trim(),
        createdBy: username.trim(),

        playerTag: ptPlayerTag.trim(),
        playerName: playerName.trim() || undefined,

        gameName: ptGameName.trim(),

        amountBase: Number(ptAmount) || 0,
        bonusRate: 0,
        bonusAmount: 0,
        amountFinal: Number(ptAmount) || 0,
        amount: Number(ptAmount) || 0,

        note: note.trim() || undefined,
        date: date || undefined,

        totalCashout: Number(ptCashoutAmount) || 0,
        reduction: Number(ptReduction) || 0,

        extraMoney: extraMoneyEnabled ? Number(extraMoney) || 0 : undefined,
      });

      // reset fields
      setPtPlayerTag("");
      setPtGameName("");
      setPtAmount("");
      setPtCashoutAmount("");
      setExtraMoneyEnabled(false);
      setExtraMoney("");
      setTagPendingInfo(null);
      setTagLookupError(null);
      setPlayerName("");
      setNote("");
      setDate(getToday());

      setOk("Saved successfully!");
    } catch (err: any) {
      console.error("Save failed:", err?.response?.data || err.message || err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Save failed. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Headlines for PLAYER TAG mode */}
      {ptPlayerTag.trim() && (
        <>
          {tagPendingInfo && tagPendingInfo.totalPending > 0 && (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Pending balance (redeem − reduction) for{" "}
              <span className="font-semibold">{tagPendingInfo.playerTag}</span>:{" "}
              <span className="font-semibold">
                {tagPendingInfo.totalPending.toFixed(2)}
              </span>
              {tagPendingInfo.pendingRedeem > 0 ||
              tagPendingInfo.pendingReduction > 0 ? (
                <div className="mt-1 text-[11px] text-amber-900">
                  Redeem total: {tagPendingInfo.pendingRedeem.toFixed(2)} ·
                  Reduction used: {tagPendingInfo.pendingReduction.toFixed(2)}
                </div>
              ) : null}
            </div>
          )}

          {ptReduction > 0 && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Reduction (Cashout − Deposit):{" "}
              <span className="font-semibold">{ptReduction.toFixed(2)}</span>
            </div>
          )}

          {tagLookupLoading && (
            <div className="mb-2 text-xs text-gray-500">
              Checking pending balance for this tag…
            </div>
          )}
          {tagLookupError && (
            <div className="mb-2 text-xs text-red-600">{tagLookupError}</div>
          )}
        </>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {/* Method (always required) */}
        <div>
          <label className="block text-sm font-medium mb-1">Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full rounded-lg border px-3 py-2"
            required
          >
            {methods.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Player Tag with suggestions from pending API */}
        <div className="relative md:col-span-3">
          <label className="block text-sm font-medium mb-1">Player Tag</label>
          <input
            ref={tagInputRef}
            value={ptPlayerTag}
            onChange={(e) => {
              const val = e.target.value;
              setPtPlayerTag(val);
              updateTagOptions(val);
            }}
            onFocus={() => {
              updateTagOptions(ptPlayerTag);
            }}
            onKeyDown={onTagKeyDown}
            placeholder="e.g. @player123"
            className="w-full rounded-lg border px-3 py-2"
            required
          />

          {tagDropdownOpen && tagOptions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-60 overflow-auto">
              {tagOptions.map((opt, i) => (
                <button
                  type="button"
                  key={opt + i}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    i === tagHighlightIndex ? "bg-gray-100" : ""
                  }`}
                  onMouseEnter={() => setTagHighlightIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    chooseTag(opt);
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Optional: quick chips for pending tags */}
          {pendingTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-[11px] text-slate-500">Pending tags:</span>
              {pendingTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setPtPlayerTag(tag);
                    updateTagOptions(tag);
                  }}
                  className="text-xs px-2 py-1 rounded-full border border-slate-300 bg-slate-50 hover:bg-slate-100"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Optional display name */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Player Name (optional)
          </label>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. John"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        {/* Game Name with suggestions from /api/games */}
        <div className="md:col-span-1 relative">
          <label className="block text-sm font-medium mb-1">Game Name</label>
          <input
            ref={gameInputRef}
            value={ptGameName}
            onChange={(e) => {
              const val = e.target.value;
              setPtGameName(val);
              updateGameOptions(val);
            }}
            onFocus={() => {
              updateGameOptions(ptGameName);
            }}
            onKeyDown={onGameKeyDown}
            placeholder="e.g. pandamaster"
            className="w-full rounded-lg border px-3 py-2"
            required
          />

          {gameDropdownOpen && gameOptions.length > 0 && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border bg-white shadow-lg max-h-60 overflow-auto">
              {gameOptions.map((opt, i) => (
                <button
                  key={opt + i}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    i === gameHighlightIndex ? "bg-gray-100" : ""
                  }`}
                  onMouseEnter={() => setGameHighlightIndex(i)}
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

        {/* Amount (deposit) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Amount (Deposit)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={ptAmount}
            onChange={(e) => setPtAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border px-3 py-2"
            required
          />
        </div>

        {/* Cashout amount */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Cashout Amount
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={ptCashoutAmount}
            onChange={(e) => setPtCashoutAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border px-3 py-2"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            If this tag has pending (redeem − reduction), this will be
            auto-filled with the current pending balance.
          </p>
        </div>

        {/* Reduction (auto) */}
        <div>
          <label className="block text-sm font-medium mb-1">Reduction</label>
          <input
            value={ptReduction.toFixed(2)}
            readOnly
            className="w-full rounded-lg border px-3 py-2 bg-gray-50"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Reduction = Cashout Amount − Deposit Amount (automatic)
          </p>
        </div>

        {/* Extra Money Toggle + Amount */}
        <div className="md:col-span-1 flex flex-col justify-end gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={extraMoneyEnabled}
              onChange={(e) => setExtraMoneyEnabled(e.target.checked)}
            />
            <span>Extra Money</span>
          </label>

          {extraMoneyEnabled && (
            <div>
              <label className="block text-xs font-medium mb-1">
                Extra Money Amount
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={extraMoney}
                onChange={(e) => setExtraMoney(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">
                This will be stored as extra money for this player tag.
              </p>
            </div>
          )}
        </div>

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

export default PlayerTagEntryForm;
