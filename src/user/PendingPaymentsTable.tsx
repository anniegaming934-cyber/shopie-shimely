// src/UserCashoutTable.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type FC,
} from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Clock } from "lucide-react";

import { apiClient } from "../apiConfig";
import { DataTable } from "../DataTable";

// Pending entries come from GameEntry /pending route
interface ServerPendingEntry {
  _id: string;
  username: string;
  type?: "freeplay" | "deposit" | "redeem" | string;
  method?: string;
  playerName?: string;
  playerTag?: string;
  gameName: string;
  totalPaid?: number;
  totalCashout?: number;
  remainingPay?: number; // combined pending (redeem or reduction)
  reduction?: number; // for deposit (player tag)
  date?: string; // "YYYY-MM-DD"
  createdAt?: string; // ISO
}

export interface PendingRow {
  _id: string;
  type: "redeem" | "deposit";
  playerName: string;
  playerTag: string;
  method: string;
  gameName: string;
  pendingAmount: number; // what we show in UI
  createdAt: string;
}

const formatDateTime = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const prettifyMethod = (m: string) => {
  if (!m) return "-";
  const lower = m.toLowerCase();
  if (lower === "cashapp") return "CashApp";
  if (lower === "paypal") return "PayPal";
  if (lower === "chime") return "Chime";
  if (lower === "venmo") return "Venmo";
  return m;
};

const PendingPayments: FC = () => {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [confirmRow, setConfirmRow] = useState<PendingRow | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // 🔄 load pending entries from GameEntry
  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await apiClient.get<ServerPendingEntry[]>(
        "/api/game-entries/pending"
      );

      console.log("Pending entries from API:", res.data);

      const mapped: PendingRow[] = res.data
        .map((e) => {
          const rawType = (e.type || "redeem").toString().toLowerCase();
          const type: "redeem" | "deposit" =
            rawType === "deposit" ? "deposit" : "redeem";

          const playerName = (e.playerName || "").trim();
          const playerTag = (e.playerTag || "").trim();

          const remainingPayNum = Number(e.remainingPay ?? 0);
          const reductionNum =
            e.reduction !== undefined && e.reduction !== null
              ? Number(e.reduction)
              : null;

          let isPending = false;
          let pendingAmountForUI = 0;

          if (type === "redeem") {
            // For redeem rows, use remainingPay
            if (Number.isFinite(remainingPayNum) && remainingPayNum > 0) {
              isPending = true;
              pendingAmountForUI = remainingPayNum;
            }
          } else if (type === "deposit") {
            // For deposit rows, use reduction if available
            if (
              reductionNum !== null &&
              Number.isFinite(reductionNum) &&
              reductionNum > 0
            ) {
              isPending = true;
              pendingAmountForUI = reductionNum;
            } else if (
              // fallback to remainingPay if reduction missing
              Number.isFinite(remainingPayNum) &&
              remainingPayNum > 0
            ) {
              isPending = true;
              pendingAmountForUI = remainingPayNum;
            }
          }

          // ❌ If not pending or amount ≤ 0 → skip (won't show in table)
          if (!isPending || pendingAmountForUI <= 0) {
            return null;
          }

          return {
            _id: e._id,
            type,
            playerName,
            playerTag,
            method: e.method || "-",
            gameName: e.gameName || "-",
            pendingAmount: pendingAmountForUI,
            createdAt: e.createdAt || e.date || "",
          };
        })
        .filter((r): r is PendingRow => r !== null)
        // extra safety: only strictly positive
        .filter((r) => r.pendingAmount > 0);

      setRows(mapped);
      setLastUpdated(new Date().toLocaleString());
    } catch (err: any) {
      console.error("Failed to load pending entries:", err);
      setError(
        err?.response?.data?.message ||
          "Failed to load pending payments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // ✅ Mark as paid → clear pending in backend + remove from list
  const handleMarkPaid = useCallback(
    async (row: PendingRow) => {
      try {
        setUpdatingId(row._id);
        setError("");

        // Backend route should clear remainingPay / reduction + isPending
        await apiClient.patch(`/api/game-entries/${row._id}/clear-pending`, {
          reduction: 0,
        });

        // Remove from UI list immediately
        setRows((prev) => prev.filter((r) => r._id !== row._id));

        // 🔁 Refresh from backend (in case combined pending changed)
        fetchPending();
      } catch (err: any) {
        console.error("Failed to mark as paid:", err);
        setError(
          err?.response?.data?.message ||
            "Failed to mark as paid. Please try again."
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [fetchPending]
  );

  const columns: ColumnDef<PendingRow>[] = useMemo(
    () => [
      {
        accessorKey: "playerName",
        header: "Player Name",
        cell: ({ getValue }) => {
          const v = (getValue() as string) || "-";
          return <span className="text-sm">{v}</span>;
        },
      },
      {
        accessorKey: "playerTag",
        header: "Player Tag",
        cell: ({ getValue }) => {
          const v = (getValue() as string) || "-";
          return <span className="text-xs font-mono">{v}</span>;
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ getValue }) => {
          const t = String(getValue() || "").toLowerCase();
          const label =
            t === "redeem"
              ? "Redeem (Our Tag)"
              : t === "deposit"
              ? "Deposit (Player Tag)"
              : t || "-";
          return (
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100">
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ getValue }) => (
          <span className="uppercase tracking-wide text-xs px-2 py-1 rounded-full bg-gray-100">
            {prettifyMethod(String(getValue() || "-"))}
          </span>
        ),
      },
      {
        accessorKey: "gameName",
        header: "Game",
        cell: ({ getValue }) => (
          <span className="text-sm">{String(getValue() || "-")}</span>
        ),
      },
      {
        accessorKey: "pendingAmount",
        header: "Pending Amount",
        cell: ({ getValue }) => {
          const num = Number(getValue() || 0);
          return <span className="font-semibold">${num.toFixed(2)}</span>;
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ getValue }) => (
          <span className="text-xs text-gray-600">
            {formatDateTime(getValue() as string)}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: () => (
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 border-orange-200">
            <Clock className="h-4 w-4" />
            Pending
          </span>
        ),
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const data = row.original;
          const busy = updatingId === data._id;

          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                onClick={() => {
                  console.log("View pending entry", data);
                }}
              >
                View
              </button>
              <button
                type="button"
                disabled={busy}
                className={`text-xs px-2 py-1 rounded text-white ${
                  busy
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                onClick={() => setConfirmRow(data)}
              >
                {busy ? "Saving..." : "Mark Paid"}
              </button>
            </div>
          );
        },
      },
    ],
    [updatingId]
  );

  const prettyAmount =
    confirmRow?.pendingAmount != null
      ? confirmRow.pendingAmount.toFixed(2)
      : "0.00";

  const confirmLabel =
    confirmRow?.playerName || confirmRow?.playerTag || "this entry";

  return (
    <div className="w-full max-w-8xl mx-auto bg-white text-black rounded-xl shadow p-4 md:p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl font-semibold">
            Pending Payments (Game Entries)
          </h2>
          <p className="text-xs md:text-sm text-gray-600">
            Redeem & player-tag entries that still have pending amounts.
          </p>
          {lastUpdated && (
            <p className="mt-1 text-[11px] md:text-xs text-gray-400">
              Last refreshed: {lastUpdated}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={fetchPending}
          disabled={loading}
          className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs md:text-sm font-medium ${
            loading
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-300"
          }`}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-600">
          Loading pending payments…
        </div>
      ) : (
        <DataTable<PendingRow> columns={columns} data={rows} />
      )}

      {/* Confirm modal */}
      {confirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white text-black rounded-lg shadow-lg p-5 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Mark as Paid?</h3>
            <p className="text-sm text-gray-700 mb-4">
              Mark <span className="font-semibold">{confirmLabel}</span>
              {"'s "}
              <span className="font-semibold">${prettyAmount}</span> as{" "}
              <span className="font-semibold">PAID</span> and clear it from
              pending?
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 text-sm rounded border border-gray-300 hover:bg-gray-100"
                onClick={() => setConfirmRow(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700"
                onClick={async () => {
                  await handleMarkPaid(confirmRow);
                  setConfirmRow(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingPayments;
