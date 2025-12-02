// src/SalaryForm.tsx
import React, { useEffect, useState } from "react";
import { apiClient } from "../apiConfig";
import SalaryTable from "./SalaryTable";

const getCurrentMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // "YYYY-MM"
};

const PER_ABSENT = 500; // 👈 per-day absent penalty

// minimal type for users coming from backend
interface SalaryUser {
  _id: string;
  username: string;
}

const SalaryForm: React.FC = () => {
  const [username, setUsername] = useState("");
  const [month, setMonth] = useState(getCurrentMonth());
  const [totalSalary, setTotalSalary] = useState("");
  const [daysAbsent, setDaysAbsent] = useState("");
  const [paidSalary, setPaidSalary] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // 👉 usernames from backend
  const [users, setUsers] = useState<SalaryUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  // load active users once
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError("");

        // adjust params if you want pending/blocked/etc.
        const { data } = await apiClient.get<SalaryUser[]>("/api/admin/users", {
          params: { status: "active" },
        });

        const list = Array.isArray(data) ? data : [];
        setUsers(list);

        // if nothing selected yet and we have at least one user,
        // preselect the first one
        if (!username && list.length > 0) {
          setUsername(list[0].username);
        }
      } catch (err) {
        console.error("Failed to load users for salary:", err);
        setUsersError("Failed to load usernames.");
        setUsers([]);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 👉 remainingSalary = (total - absent*500) - paid, but never below 0
  const remainingSalary = (() => {
    const total = Number(totalSalary) || 0;
    const paid = Number(paidSalary) || 0;
    const absent = Number(daysAbsent) || 0;

    const deduction = absent * PER_ABSENT;
    const netSalary = Math.max(0, total - deduction);
    const rem = netSalary - paid;

    return rem > 0 ? rem : 0;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");

    if (!username.trim() || !totalSalary.trim()) {
      setError("Username and Total Salary are required.");
      return;
    }

    try {
      setSaving(true);

      await apiClient.post("/api/salaries", {
        username: username.trim(),
        month,
        totalSalary: Number(totalSalary),
        daysAbsent: Number(daysAbsent) || 0,
        paidSalary: Number(paidSalary) || 0,
        remainingSalary, // already includes absence penalty
        dueDate: dueDate || null,
        note: note.trim() || "",
      });

      setOk("Salary record saved!");

      // reset except username + month
      setTotalSalary("");
      setDaysAbsent("");
      setPaidSalary("");
      setDueDate("");
      setNote("");
    } catch (err: any) {
      console.error("Salary save error:", err);
      setError(err?.response?.data?.message || "Failed to save salary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white shadow-md rounded-2xl p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-2">Add / Update Salary</h2>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {error}
          </p>
        )}
        {ok && (
          <p className="text-sm text-green-600 bg-green-50 border border-green-200 px-3 py-2 rounded">
            {ok}
          </p>
        )}
        {usersError && (
          <p className="text-xs text-red-500 bg-red-50 border border-red-200 px-3 py-1 rounded">
            {usersError}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Username from backend */}
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 bg-white"
              required
            >
              {usersLoading && (
                <option value="">Loading users...</option>
              )}
              {!usersLoading && users.length === 0 && (
                <option value="">No users available</option>
              )}
              {!usersLoading &&
                users.length > 0 && (
                  <>
                    <option value="">Select username</option>
                    {users.map((u) => (
                      <option key={u._id} value={u.username}>
                        {u.username}
                      </option>
                    ))}
                  </>
                )}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-medium mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Total Salary */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Total Salary
            </label>
            <input
              type="number"
              min={0}
              value={totalSalary}
              onChange={(e) => setTotalSalary(e.target.value)}
              placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          {/* Days Absent */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Days Absent
            </label>
            <input
              type="number"
              min={0}
              value={daysAbsent}
              onChange={(e) => setDaysAbsent(e.target.value)}
              placeholder="0"
              className="w-full border rounded-lg px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              Each absent day deducts {PER_ABSENT} from salary.
            </p>
          </div>

          {/* Paid Salary */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Paid Salary
            </label>
            <input
              type="number"
              min={0}
              value={paidSalary}
              onChange={(e) => setPaidSalary(e.target.value)}
              placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Remaining Salary (auto) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Remaining Salary
            </label>
            <input
              value={remainingSalary.toFixed(2)}
              readOnly
              className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
            />
          </div>

          {/* Note */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Submit */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto bg-black text-white px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Salary"}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-5">
        <SalaryTable />
      </div>
    </>
  );
};

export default SalaryForm;
