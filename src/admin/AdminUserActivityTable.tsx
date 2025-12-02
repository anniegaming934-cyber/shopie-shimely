import React, { useEffect, useState } from "react";
import { apiClient } from "../apiConfig";
import { User, Pencil, Trash2, KeyRound, X, Save, Loader2 } from "lucide-react";
import DeleteConfirmDialog from "../DeleteConfirmDialog";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

const API_BASE = "/api/logins";

// Raw shape from backend
interface RawActivity {
  _id: string;
  username: string;
  email?: string | null;
  signInAt: string | null;
  signOutAt: string | null;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Normalized, unique per username (latest session)
export interface UserRow {
  id: string;
  username: string;
  email: string | null;
  lastLogin: string | null;
  lastLogout: string | null;
  isOnline: boolean;
}

interface AdminUserActivityTableProps {
  // Optional: when you click a user, parent can show history or game-entries
  onSelectUser?: (username: string) => void;
}

const AdminUserActivityTable: React.FC<AdminUserActivityTableProps> = ({
  onSelectUser,
}) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal (username only)
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset PW modal
  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Delete dialog state
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // count of users logged in last 24h
  const [totalLoggedLast24h, setTotalLoggedLast24h] = useState(0);

  useEffect(() => {
    fetchRecords();
  }, []);

  const normalizeDateValue = (
    value: string | null | undefined
  ): string | null => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const normalizeActivity = (r: RawActivity): UserRow => {
    const loginIso = normalizeDateValue(r.signInAt);
    const logoutIso = normalizeDateValue(r.signOutAt);

    // Prefer backend isOnline, but we can also infer
    let isOnline = !!r.isOnline;
    if (!r.isOnline && loginIso && !logoutIso) {
      isOnline = true;
    }

    return {
      id: r._id,
      username: r.username,
      email: r.email ?? null,
      lastLogin: loginIso,
      lastLogout: logoutIso,
      isOnline,
    };
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      // get all login sessions
      const { data } = await apiClient.get<RawActivity[]>(API_BASE);

      const map = new Map<string, UserRow>();

      data.forEach((raw) => {
        const normalized = normalizeActivity(raw);
        const key = normalized.username;

        const existing = map.get(key);
        if (!existing) {
          map.set(key, normalized);
        } else {
          const prevLogin = existing.lastLogin
            ? new Date(existing.lastLogin).getTime()
            : 0;
          const newLogin = normalized.lastLogin
            ? new Date(normalized.lastLogin).getTime()
            : 0;

          if (newLogin > prevLogin) {
            map.set(key, normalized);
          }
        }
      });

      const rows = Array.from(map.values()).sort((a, b) => {
        const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        return bTime - aTime;
      });

      const now = Date.now();
      const threshold = now - 24 * 60 * 60 * 1000;
      const last24Count = rows.filter((u) => {
        if (!u.lastLogin) return false;
        const t = new Date(u.lastLogin).getTime();
        return !Number.isNaN(t) && t >= threshold;
      }).length;

      setUsers(rows);
      setTotalLoggedLast24h(last24Count);
    } catch (err) {
      console.error("Failed to load user activity logs:", err);
      setError("Failed to load user activity logs.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrettyDate = (iso: string | null): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (iso: string | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatus = (u: UserRow): "online" | "offline" => {
    if (u.isOnline) return "online";
    if (!u.lastLogin) return "offline";
    if (!u.lastLogout) return "online";
    const loginTime = new Date(u.lastLogin).getTime();
    const logoutTime = new Date(u.lastLogout).getTime();
    return logoutTime < loginTime ? "online" : "offline";
  };

  const renderStatusPill = (u: UserRow) => {
    const status = getStatus(u);
    const label = status === "online" ? "Online" : "Offline";
    const pillClass =
      status === "online"
        ? "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
        : "inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200";
    const dotClass =
      status === "online"
        ? "h-2 w-2 rounded-full bg-emerald-500"
        : "h-2 w-2 rounded-full bg-gray-400";

    return (
      <span className={pillClass}>
        <span className={dotClass} />
        {label}
      </span>
    );
  };

  // ---- Edit (username) ----
  const openEdit = (user: UserRow) => {
    setEditingUser(user);
    setEditUsername(user.username);
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditUsername("");
    setSavingEdit(false);
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    if (!editUsername.trim()) return;

    try {
      setSavingEdit(true);
      // TODO: hook this to a real backend endpoint for renaming a user
      console.log("Update username:", editingUser.username, "→", editUsername);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id ? { ...u, username: editUsername.trim() } : u
        )
      );
      closeEdit();
    } catch (err) {
      console.error("Failed to save user changes:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  // ---- Delete ----
  const handleDeleteClick = (user: UserRow) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    setError(null);

    try {
      // DELETE /api/logins/user/:username  (clear all sessions for that user)
      await apiClient.delete(
        `${API_BASE}/user/${encodeURIComponent(selectedUser.username)}`
      );

      setUsers((prev) =>
        prev.filter((u) => u.username !== selectedUser.username)
      );
    } catch (err) {
      console.error("Failed to delete user activity:", err);
      setError("Failed to delete user activity.");
    } finally {
      setIsDeleting(false);
      setIsDialogOpen(false);
      setSelectedUser(null);
    }
  };

  // ---- Reset password ----
  const openResetPw = (user: UserRow) => {
    setPwUser(user);
    setNewPassword("");
    setResetError("");
    setResetSuccess("");
  };

  const closeResetPw = () => {
    setPwUser(null);
    setNewPassword("");
    setResetError("");
    setResetSuccess("");
    setResetLoading(false);
  };

  const submitResetPw = async () => {
    if (!pwUser) return;
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    try {
      setResetLoading(true);
      setResetError("");
      setResetSuccess("");

      // TODO: call real reset-password endpoint for this user
      console.log("Reset PW for:", pwUser.username, "→", newPassword);

      setResetSuccess("Password reset successfully.");
      setNewPassword("");
    } catch (err) {
      console.error("Failed to reset password:", err);
      setResetError("Failed to reset password.");
    } finally {
      setResetLoading(false);
    }
  };

  // ---------- React Table setup ----------
  const columns: ColumnDef<UserRow>[] = [
    {
      id: "index",
      header: "#",
      cell: (info) => info.row.index + 1,
      size: 40,
    },
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => {
        const u = row.original;
        const clickable = !!onSelectUser;

        const content = (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-500" />
            <span
              className={
                clickable
                  ? "font-medium text-indigo-700 hover:underline cursor-pointer"
                  : "font-medium text-gray-800"
              }
            >
              {u.username}
            </span>
          </div>
        );

        if (!clickable) {
          return content;
        }

        return (
          <button
            type="button"
            onClick={() => onSelectUser(u.username)}
            className="text-left w-full"
          >
            {content}
          </button>
        );
      },
    },
    {
      accessorKey: "lastLogin",
      header: "Checked In",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex flex-col text-gray-800">
            <span className="text-sm font-medium">
              {formatPrettyDate(u.lastLogin)}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(u.lastLogin)}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "lastLogout",
      header: "Checked Out",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex flex-col text-gray-800">
            <span className="text-sm font-medium">
              {formatPrettyDate(u.lastLogout)}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(u.lastLogout)}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => renderStatusPill(row.original),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const u = row.original;
        const isThisDeleting =
          isDeleting && selectedUser && selectedUser.username === u.username;

        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => openEdit(u)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={() => openResetPw(u)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              <KeyRound className="h-3 w-3" />
              Reset PW
            </button>
            <button
              onClick={() => handleDeleteClick(u)}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
            >
              <Trash2 className="h-3 w-3" />
              {isThisDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const visibleRows = table.getRowModel().rows;

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <User className="h-5 w-5 text-indigo-500" />
          User Activity & Management
        </h2>

        <div className="flex items-center gap-3">
          <div className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            Logged in last 24h:{" "}
            <span className="font-semibold">{totalLoggedLast24h}</span>
          </div>

          <button
            onClick={fetchRecords}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mb-3">
          {error}
        </div>
      )}

      {/* React Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200">
          <thead className="bg-gray-100 text-gray-700 font-semibold">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`px-4 py-2 text-left ${
                      header.id === "actions" ? "text-right" : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-gray-500 py-6 italic"
                >
                  {loading ? "Loading..." : "No users with activity found."}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-2 ${
                        cell.column.id === "actions" ? "text-right" : ""
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirm dialog */}
      <DeleteConfirmDialog
        isOpen={isDialogOpen}
        onCancel={() => {
          setIsDialogOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        message={
          selectedUser
            ? `Are you sure you want to permanently delete activity for ${selectedUser.username}?`
            : "Are you sure you want to permanently delete this user activity?"
        }
      />

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Pencil className="w-4 h-4" />
                Edit User
              </h3>
              <button
                onClick={closeEdit}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700">
                  Username
                </label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeEdit}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingEdit && <Loader2 className="w-3 h-3 animate-spin" />}
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {pwUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Reset Password
              </h3>
              <button
                onClick={closeResetPw}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {pwUser.username}
                {pwUser.email ? ` (${pwUser.email})` : ""}
              </p>
            </div>

            {resetError && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                {resetSuccess}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                New Password
              </label>
              <input
                type="password"
                className="w-full border rounded px-3 py-2 text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
              <p className="text-xs text-gray-500">
                Minimum 6 characters. User will log in using this new password.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeResetPw}
                className="px-3 py-1.5 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={submitResetPw}
                disabled={resetLoading}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {resetLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserActivityTable;
