// src/AdminPendingUsersTable.tsx
import { useCallback, useEffect, useState } from "react";
import type { FC } from "react";
import { apiClient } from "../apiConfig";
import { DataTable } from "../DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, RefreshCcw, Ban, Trash2 } from "lucide-react";

interface AdminUser {
  _id: string;
  username: string;
  email: string;
  role: string;
  isApproved?: boolean;
  status?: string;
  createdAt?: string;
}

const ADMIN_USERS_API = "/api/admin/users";

const AdminPendingUsersTable: FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<
    "approve" | "block" | "delete" | null
  >(null);
  const [error, setError] = useState("");

  const loadPendingUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get<AdminUser[]>(ADMIN_USERS_API, {
        params: { status: "pending" }, // expects backend filter
      });

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load pending users:", err);
      setError("Failed to load pending users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingUsers();
  }, [loadPendingUsers]);

  const handleApprove = async (id: string) => {
    try {
      setProcessingId(id);
      setProcessingAction("approve");
      setError("");
      await apiClient.patch(`${ADMIN_USERS_API}/${id}/approve`);
      // Remove from list after approval
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      console.error("Failed to approve user:", err);
      setError("Failed to approve user. Please try again.");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleBlock = async (id: string) => {
    try {
      setProcessingId(id);
      setProcessingAction("block");
      setError("");
      await apiClient.patch(`${ADMIN_USERS_API}/${id}/block`);
      // Remove from pending list after blocking
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      console.error("Failed to block user:", err);
      setError("Failed to block user. Please try again.");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setProcessingId(id);
      setProcessingAction("delete");
      setError("");
      await apiClient.delete(`${ADMIN_USERS_API}/${id}`);
      // Remove from list
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError("Failed to delete user. Please try again.");
    } finally {
      setProcessingId(null);
      setProcessingAction(null);
    }
  };

  const columns: ColumnDef<AdminUser>[] = [
    {
      header: "Username",
      accessorKey: "username",
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-800">
          {String(getValue() ?? "")}
        </span>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-700">
          {String(getValue() ?? "")}
        </span>
      ),
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: ({ getValue }) => {
        const v = getValue() as string | undefined;
        if (!v) return <span className="text-xs text-slate-400">—</span>;
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) {
          return <span className="text-xs text-slate-600">{v}</span>;
        }
        return (
          <span className="text-xs text-slate-600">
            {d.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      header: "Actions",
      id: "action",
      cell: ({ row }) => {
        const id = row.original._id;
        const isThisRowProcessing = processingId === id;

        return (
          <div className="flex items-center gap-2 justify-end">
            {/* Approve */}
            <button
              onClick={() => handleApprove(id)}
              disabled={isThisRowProcessing}
              className={`inline-flex items-center px-2 py-1 text-xs rounded-md border ${
                isThisRowProcessing && processingAction === "approve"
                  ? "bg-emerald-200 text-emerald-700 cursor-not-allowed"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 size={14} className="mr-1" />
              {isThisRowProcessing && processingAction === "approve"
                ? "Approving..."
                : "Approve"}
            </button>

            {/* Block */}
            <button
              onClick={() => handleBlock(id)}
              disabled={isThisRowProcessing}
              className={`inline-flex items-center px-2 py-1 text-xs rounded-md border ${
                isThisRowProcessing && processingAction === "block"
                  ? "bg-amber-200 text-amber-800 cursor-not-allowed"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              }`}
            >
              <Ban size={14} className="mr-1" />
              {isThisRowProcessing && processingAction === "block"
                ? "Blocking..."
                : "Block"}
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(id)}
              disabled={isThisRowProcessing}
              className={`inline-flex items-center px-2 py-1 text-xs rounded-md border ${
                isThisRowProcessing && processingAction === "delete"
                  ? "bg-red-200 text-red-700 cursor-not-allowed"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <Trash2 size={14} className="mr-1" />
              {isThisRowProcessing && processingAction === "delete"
                ? "Deleting..."
                : "Delete"}
            </button>
          </div>
        );
      },
    },
  ];

  // If no pending users and no error → small info block
  if (!loading && users.length === 0 && !error) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Pending User Approvals
          </h2>
          <button
            onClick={loadPendingUsers}
            className="inline-flex items-center text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw size={12} className="mr-1" />
            Refresh
          </button>
        </div>
        <p className="text-xs text-slate-500">
          No users waiting for approval right now.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-800">
          Pending User Approvals
        </h2>
        <button
          onClick={loadPendingUsers}
          className="inline-flex items-center text-[11px] px-2 py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          <RefreshCcw size={12} className="mr-1" />
          Refresh
        </button>
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm p-2">
        <DataTable columns={columns} data={users} />
      </div>
    </div>
  );
};

export default AdminPendingUsersTable;
