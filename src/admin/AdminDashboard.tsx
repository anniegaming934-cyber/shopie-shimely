// src/AdminDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import type { FC } from "react";
import { apiClient } from "../apiConfig";
import GameRow from "./Gamerow"; // used ONLY for the modal when editing
import AddGameForm from "./Addgame";
import PaymentForm, { type PaymentFormProps } from "../user/Paymentform";
import PaymentHistory from "../user/PaymentHistory";
import Sidebar, { type SidebarSection } from "./Sidebar";
import UserAdminTable from "./UserAdminTable";
import UserHistory from "./AdminUserHistory";
import AdminUserActivityTable from "./AdminUserActivityTable";
import SalaryForm from "./SalaryForm";
import FacebookLeadForm from "../FacebookLeadForm";
import UserAllCashoutTable from "./UserALLCashout";
import GameLogins from "./GameLogin";
import ScheduleForm from "./ScheduleForm";
import AdminPendingUsersTable from "./AdminPendingUsersTable";
import GameStatCards from "./GameStatCards";
import GameTable, { type GameRowDT } from "./GameTable"; // ⬅ NEW: use GameTable

interface Game {
  id: number;
  name: string;
  coinsEarned: number; // redeem in your net calc
  coinsSpent: number; // freeplay+deposit in your net calc
  coinsRecharged: number; // editable
  lastRechargeDate?: string;

  // comes from /api/games aggregation
  totalCoins?: number; // net coin for that game (backend calc)
}

interface AdminDashboardProps {
  username: string;
  onLogout: () => void;
}

// API constants
const GAMES_API = "/api/games";
const PAY_API = "/api"; // /api/totals, /api/payments/*, /api/reset
const COIN_VALUE = 0.15;

const AdminDashboard: FC<AdminDashboardProps> = ({ username, onLogout }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [activeSection, setActiveSection] =
    useState<SidebarSection>("overview");

  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  const [paymentTotals, setPaymentTotals] = useState({
    cashapp: 0,
    paypal: 0,
    chime: 0,
  });

  // 🔹 Games month/year (for /api/games)
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  // ---------------------------
  // Load payment totals once
  // ---------------------------
  useEffect(() => {
    fetchTotals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // Reload games when games year/month changes
  // ---------------------------
  useEffect(() => {
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const fetchGames = async () => {
    try {
      const { data } = await apiClient.get<Game[]>(GAMES_API, {
        params: { year, month },
      });

      if (!Array.isArray(data)) {
        console.error("❌ Expected an array of games, got:", data);
        setGames([]);
        return;
      }

      setGames(data);
    } catch (error) {
      console.error("Failed to fetch games:", error);
      setGames([]);
    }
  };

  const fetchTotals = async () => {
    try {
      const { data } = await apiClient.get(`${PAY_API}/totals`);
      setPaymentTotals({
        cashapp: Number(data.cashapp) || 0,
        paypal: Number(data.paypal) || 0,
        chime: Number(data.chime) || 0,
      });
    } catch (e) {
      console.error("Failed to load payment totals:", e);
    }
  };

  const handleUpdate = (
    id: number,
    spent: number,
    earned: number,
    recharge: number,
    rechargeDateISO?: string
  ) => {
    let updatedTotals: {
      coinsSpent: number;
      coinsEarned: number;
      coinsRecharged: number;
      lastRechargeDate?: string | null;
    } | null = null;

    setGames((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;

        const updated = {
          ...g,
          coinsSpent: g.coinsSpent + spent,
          coinsEarned: g.coinsEarned + earned,
          coinsRecharged: g.coinsRecharged + recharge,
          lastRechargeDate:
            recharge > 0
              ? rechargeDateISO || new Date().toISOString().slice(0, 10)
              : g.lastRechargeDate,
        };

        updatedTotals = {
          coinsSpent: updated.coinsSpent,
          coinsEarned: updated.coinsEarned,
          coinsRecharged: updated.coinsRecharged,
          lastRechargeDate: updated.lastRechargeDate ?? null,
        };

        return updated;
      })
    );

    if (updatedTotals) {
      apiClient
        .put(`${GAMES_API}/${id}`, updatedTotals)
        .catch((err) => console.error("Failed to persist game update:", err));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`${GAMES_API}/${id}`);
      await fetchGames();
    } catch (error) {
      console.error("Failed to delete game:", error);
    }
  };

  const handleResetRecharge = async (id: number) => {
    try {
      try {
        await apiClient.post(`${GAMES_API}/${id}/reset-recharge`);
      } catch {
        await apiClient.put(`${GAMES_API}/${id}`, {
          coinsRecharged: 0,
          lastRechargeDate: null,
        });
      }
      setGames((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, coinsRecharged: 0, lastRechargeDate: undefined }
            : g
        )
      );
    } catch (e) {
      console.error("Failed to reset recharge:", e);
    }
  };

  // ---------------------------
  // Payments (cashin / cashout separate)
  // ---------------------------
  const onRecharge: PaymentFormProps["onRecharge"] = async (payload) => {
    if (!payload) return;

    const { txType, note, playerName, date, ...rest } = payload;

    if (txType === "cashout") {
      const { data } = await apiClient.post(`${PAY_API}/payments/cashout`, {
        ...rest,
        playerName,
        date,
      });
      setPaymentTotals(data.totals);
    } else {
      const { data } = await apiClient.post(`${PAY_API}/payments/cashin`, {
        ...rest,
        note,
        date,
      });
      setPaymentTotals(data.totals);
    }
  };

  const onReset: PaymentFormProps["onReset"] = async () => {
    const { data } = await apiClient.post(`${PAY_API}/reset`);
    setPaymentTotals(data.totals);
    return data.totals;
  };

  const editingGame = useMemo(
    () => games.find((g) => g.id === editingGameId) || null,
    [games, editingGameId]
  );

  // ---------------------------
  // Render
  // ---------------------------
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* LEFT: Sidebar */}
      <Sidebar
        mode={"admin"}
        active={activeSection}
        onChange={setActiveSection}
        onLogout={onLogout}
        username={username}
      />

      {/* RIGHT: Main area */}
      <div className="flex-1 flex flex-col">
        {/* Top header bar */}
        <header className="flex flex-wrap items-center gap-3 px-4 sm:px-8 py-4 border-b bg-white">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {activeSection === "overview" && "Admin Overview"}
            {activeSection === "games" && "Games"}
            {activeSection === "playerinfo" && "Player Info"}
            {activeSection === "UserAdminTable" && "User Admin"}
            {activeSection === "userHistroy" && "User History"}
            {activeSection === "employeeSalary" && "Employee Salary"}
            {activeSection === "settings" && "Settings"}
          </h1>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          {/* OVERVIEW TAB */}
          {activeSection === "overview" && (
            <>
              <AdminPendingUsersTable />
              <GameStatCards />

              {/* Admin user activity */}
              <div className="mb-8">
                <AdminUserActivityTable />
              </div>
              <div className="mb-8">
                <UserAllCashoutTable />
              </div>
            </>
          )}

          {/* GAMES TAB */}
          {activeSection === "games" && (
            <>
              <div className="mb-6">
                <AddGameForm onGameAdded={fetchGames} />
              </div>

              {/* Games month/year controls */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-700">Games Period:</span>
                  <select
                    className="border text-xs rounded px-2 py-1 bg-white"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }).map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    className="border text-xs rounded px-2 py-1 w-20 bg-white"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                  />
                </div>

                <button
                  onClick={fetchGames}
                  className="text-xs px-3 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Refresh Games
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 shadow-sm bg-white p-2">
                <GameTable
                  data={games as GameRowDT[]}
                  coinValue={COIN_VALUE}
                  onEditStart={(id) => setEditingGameId(id)}
                  onResetRecharge={handleResetRecharge}
                  onDelete={handleDelete}
                />
              </div>
            </>
          )}

          {/* PAYMENTS TAB */}
          {activeSection === "payments" && (
            <div className="grid grid-cols-1 gap-6">
              <PaymentForm
                initialTotals={paymentTotals}
                onTotalsChange={(t) => setPaymentTotals(t)}
                onRecharge={onRecharge}
                onReset={onReset}
              />
              <PaymentHistory apiBase={PAY_API} />
            </div>
          )}

          {/* PLAYER INFO TAB */}
          {activeSection === "playerinfo" && <FacebookLeadForm />}

          {/* USER ADMIN TAB */}
          {activeSection === "UserAdminTable" && (
            <UserAdminTable
              onViewHistory={(usernameForHistory: string) => {
                setSelectedUsername(usernameForHistory);
                setActiveSection("userHistroy");
              }}
            />
          )}

          {/* USER HISTORY TAB */}
          {activeSection === "userHistroy" && (
            <>
              {!selectedUsername && (
                <div className="mb-4 text-sm text-gray-600">
                  Please select a user from{" "}
                  <span className="font-semibold">User Admin</span> to view
                  their activity history.
                </div>
              )}
              {selectedUsername && <UserHistory username={selectedUsername} />}
            </>
          )}

          {/* EMPLOYEE SALARY TAB */}
          {activeSection === "employeeSalary" && <SalaryForm />}
          {activeSection === "gameLogins" && <GameLogins />}
          {activeSection === "schedule" && <ScheduleForm />}

          {/* SETTINGS TAB */}
          {activeSection === "settings" && (
            <div className="text-sm text-gray-600">
              <p>Settings coming soon (coin value, theme, etc.).</p>
            </div>
          )}
        </main>
      </div>

      {/* Editing modal for a single game */}
      {editingGame && (
        <GameRow
          key={editingGame.id}
          game={editingGame}
          coinValue={COIN_VALUE}
          isEditing={true}
          onEditStart={() => {}}
          onUpdate={(
            id,
            _spent,
            _earned,
            rechargeChange,
            _totalCoinsAfter,
            rechargeDateISO
          ) => {
            handleUpdate(id, 0, 0, rechargeChange, rechargeDateISO);
          }}
          onCancel={() => setEditingGameId(null)}
          onDelete={() => {}}
          onResetRecharge={handleResetRecharge}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
