import React, { type FC, useState } from "react";
import { Loader2, DollarSign, RotateCcw, AlertTriangle } from "lucide-react";

export type PaymentMethod = "cashapp" | "paypal" | "chime";
type Totals = { cashapp: number; paypal: number; chime: number };
export type TxType = "cashin" | "cashout";

export interface PaymentFormProps {
  initialTotals?: Partial<Totals>;
  onTotalsChange?: (totals: Totals) => void;
  onRecharge?: (payload: {
    amount: number;
    method: PaymentMethod;
    note?: string;
    playerName?: string; // <-- will be sent for both types
    totalPaid?: number; // cashout-only
    totalCashout?: number; // cashout-only
    date?: string;
    txType: TxType;
  }) => Promise<void> | void;
  onReset?: () => Promise<Totals> | Totals | void;
}

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const TotalPill: FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div
    className="px-3 py-1 text-sm font-semibold rounded-full"
    style={{ backgroundColor: color, color: "white" }}
  >
    {label}: {fmtUSD(value)}
  </div>
);

const PaymentForm: FC<PaymentFormProps> = ({
  initialTotals,
  onTotalsChange,
  onRecharge,
  onReset,
}) => {
  const [totals, setTotals] = useState<Totals>({
    cashapp: initialTotals?.cashapp || 0,
    paypal: initialTotals?.paypal || 0,
    chime: initialTotals?.chime || 0,
  });
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cashapp");
  const [note, setNote] = useState("");
  const [playerName, setPlayerName] = useState(""); // <-- used for both
  const [totalPaid, setTotalPaid] = useState("");
  const [totalCashout, setTotalCashout] = useState("");
  const [txType, setTxType] = useState<TxType>("cashin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }

    // NEW: cashout requires playerName (backend enforces this)
    if (txType === "cashout" && !playerName.trim()) {
      setError("Player name is required for cash out");
      return;
    }

    setLoading(true);
    try {
      await onRecharge?.({
        amount: amt,
        method,
        note: note || undefined,
        // NEW: always send playerName if provided (optional for cashin, required for cashout)
        playerName: playerName.trim() ? playerName.trim() : undefined,
        totalPaid:
          txType === "cashout" ? parseFloat(totalPaid) || 0 : undefined,
        totalCashout:
          txType === "cashout" ? parseFloat(totalCashout) || 0 : undefined,
        txType,
        date: new Date().toISOString(),
      });

      // optimistic totals update
      setTotals((prev) => {
        const newTotals = { ...prev };
        newTotals[method] += txType === "cashin" ? amt : -amt;
        onTotalsChange?.(newTotals);
        return newTotals;
      });

      // reset inputs
      setAmount("");
      setNote("");
      setPlayerName("");
      setTotalPaid("");
      setTotalCashout("");
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Failed to process"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const newTotals = (await onReset?.()) || totals;
    setTotals(newTotals);
    onTotalsChange?.(newTotals);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white rounded-xl text-black shadow-md border border-gray-300 space-y-4"
    >
      <div className="flex justify-between gap-2 flex-wrap">
        <TotalPill label="CashApp" value={totals.cashapp} color="#22c55e" />
        <TotalPill label="PayPal" value={totals.paypal} color="#3b82f6" />
        <TotalPill label="Chime" value={totals.chime} color="#a855f7" />
      </div>

      <div className="flex gap-3 items-center">
        <label className="font-medium">Type:</label>
        <select
          value={txType}
          onChange={(e) => setTxType(e.target.value as TxType)}
          className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-md"
        >
          <option value="cashin">Cash In</option>
          <option value="cashout">Cash Out</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label>Amount ($)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-md"
        />
      </div>

      {/* Player Name (optional for cashin, REQUIRED for cashout) */}
      <div className="flex flex-col gap-2">
        <label>
          Player Name{" "}
          {txType === "cashout" && <span className="text-red-600">*</span>}
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-md"
          placeholder={
            txType === "cashout"
              ? "Enter player's name (required)"
              : "Enter player's name (optional)"
          }
          required={txType === "cashout"}
        />
      </div>

      {/* Cashout-only fields */}
      {txType === "cashout" && (
        <>
          <div className="flex flex-col gap-2">
            <label>Total Paid</label>
            <input
              type="number"
              step="0.01"
              value={totalPaid}
              onChange={(e) => setTotalPaid(e.target.value)}
              className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-md"
              placeholder="Enter total paid"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label>Total Cashout</label>
            <input
              type="number"
              step="0.01"
              value={totalCashout}
              onChange={(e) => setTotalCashout(e.target.value)}
              className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-md"
              placeholder="Enter total cashout amount"
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <label>Method</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as PaymentMethod)}
          className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-md"
        >
          <option value="cashapp">CashApp</option>
          <option value="paypal">PayPal</option>
          <option value="chime">Chime</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label>Note (optional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="bg-gray-100 border border-gray-300 px-2 py-1 rounded-md"
          placeholder="Any note..."
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <DollarSign size={18} />
          )}
          Submit
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="bg-gray-200 hover:bg-gray-300 text-black px-4 py-2 rounded-md flex items-center gap-2"
        >
          <RotateCcw size={18} /> Reset Totals
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;
