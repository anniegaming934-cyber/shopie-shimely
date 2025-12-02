// src/FacebookLeadForm.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type FC,
} from "react";
import { apiClient } from "./apiConfig";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { PaginationState } from "@tanstack/react-table";

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  contactPreference?: "whatsapp" | "telegram";
  facebookLink?: string;
  createdAt?: string;
}

interface FacebookDetail {
  _id: string;
  email: string;
  label?: string;
  createdAt?: string;
}

const FacebookLeadForm: FC = () => {
  // 🔹 Lead form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPreference, setContactPreference] = useState<
    "whatsapp" | "telegram" | ""
  >("");
  const [facebookLink, setFacebookLink] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 🔹 Lead table state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 🔹 Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // 🔹 Facebook details form state (for YOU)
  const [fbEmail, setFbEmail] = useState("");
  const [fbPassword, setFbPassword] = useState("");
  const [fbLabel, setFbLabel] = useState("");
  const [fbShowPassword, setFbShowPassword] = useState(false);
  const [fbSaving, setFbSaving] = useState(false);
  const [fbError, setFbError] = useState("");
  const [fbSuccess, setFbSuccess] = useState("");
  const [fbEditingId, setFbEditingId] = useState<string | null>(null);

  // 🔹 Facebook details table state
  const [facebookDetails, setFacebookDetails] = useState<FacebookDetail[]>([]);
  const [loadingFacebookDetails, setLoadingFacebookDetails] = useState(false);

  // ==========================
  // Helpers
  // ==========================
  const resetLeadForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setContactPreference("");
    setFacebookLink("");
    setEditingId(null);
    setError("");
    setSuccess("");
  };

  const resetFbForm = () => {
    setFbEmail("");
    setFbPassword("");
    setFbLabel("");
    setFbEditingId(null);
    setFbError("");
    setFbSuccess("");
  };

  const loadLeads = useCallback(async () => {
    try {
      setLoadingLeads(true);
      const { data } = await apiClient.get<Lead[]>("/api/facebook-leads");
      setLeads(data || []);
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  const loadFacebookDetails = useCallback(async () => {
    try {
      setLoadingFacebookDetails(true);
      const { data } = await apiClient.get<FacebookDetail[]>(
        "/api/facebook-details"
      );
      setFacebookDetails(data || []);
    } catch (err) {
      console.error("Failed to load facebook details:", err);
    } finally {
      setLoadingFacebookDetails(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
    void loadFacebookDetails();
  }, [loadLeads, loadFacebookDetails]);

  // Reset to first page whenever the data size changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [leads.length]);

  // ==========================
  // Submit (Create / Update) Lead
  // ==========================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Name is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        contactPreference: contactPreference || undefined,
        facebookLink: facebookLink.trim() || undefined,
      };

      if (editingId) {
        await apiClient.put(`/api/facebook-leads/${editingId}`, payload);
        setSuccess("Lead updated ✅");
      } else {
        await apiClient.post("/api/facebook-leads", payload);
        setSuccess("Lead saved ✅");
      }

      resetLeadForm();
      await loadLeads();
    } catch (err: any) {
      console.error("Failed to save lead:", err);
      setError(
        err?.response?.data?.message || "Failed to save lead. Try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================
  // Edit lead from table
  // ==========================
  const handleEdit = useCallback((lead: Lead) => {
    setEditingId(lead._id);
    setName(lead.name || "");
    setEmail(lead.email || "");
    setPhone(lead.phone || "");
    setContactPreference((lead.contactPreference as any) || "");
    setFacebookLink(lead.facebookLink || "");
    setError("");
    setSuccess("");
  }, []);

  // ==========================
  // Delete lead
  // ==========================
  const handleDelete = useCallback(
    async (id: string) => {
      const confirmDelete = window.confirm("Delete this lead?");
      if (!confirmDelete) return;

      setError("");
      setSuccess("");

      try {
        await apiClient.delete(`/api/facebook-leads/${id}`);
        setLeads((prev) => prev.filter((l) => l._id !== id));
        setSuccess("Lead deleted ✅");
        if (editingId === id) {
          resetLeadForm();
        }
      } catch (err: any) {
        console.error("Failed to delete lead:", err);
        setError(
          err?.response?.data?.message || "Failed to delete lead. Try again."
        );
      }
    },
    [editingId]
  );

  // ==========================
  // Export CSV for leads
  // ==========================
  const handleExportCsv = () => {
    if (!leads.length) return;

    const headers = [
      "Name",
      "Email",
      "Phone",
      "ContactPreference",
      "FacebookLink",
      "CreatedAt",
    ];

    const rows = leads.map((l) => [
      l.name ?? "",
      l.email ?? "",
      l.phone ?? "",
      l.contactPreference ?? "",
      l.facebookLink ?? "",
      l.createdAt ?? "",
    ]);

    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row
            .map((field) => {
              const s = String(field ?? "");
              if (s.includes(",") || s.includes('"') || s.includes("\n")) {
                return `"${s.replace(/"/g, '""')}"`;
              }
              return s;
            })
            .join(",")
        )
        .join("\n") + "\n";

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "facebook-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ==========================
  // Save / Update YOUR Facebook details
  // ==========================
  const handleFbSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFbError("");
    setFbSuccess("");

    if (!fbEmail.trim()) {
      setFbError("Email is required.");
      return;
    }

    // On create: password required
    if (!fbEditingId && !fbPassword.trim()) {
      setFbError("Password is required for a new record.");
      return;
    }

    try {
      setFbSaving(true);

      if (fbEditingId) {
        // Update existing record
        const payload: any = {
          email: fbEmail.trim(),
          label: fbLabel.trim() || undefined,
        };
        if (fbPassword.trim()) {
          payload.password = fbPassword.trim();
        }

        const { data } = await apiClient.put(
          `/api/facebook-details/${fbEditingId}`,
          payload
        );
        setFbSuccess(data?.message || "Details updated.");
      } else {
        // Create / upsert record
        const { data } = await apiClient.post("/api/facebook-details", {
          email: fbEmail.trim(),
          password: fbPassword.trim(),
          label: fbLabel.trim() || undefined,
        });
        setFbSuccess(data?.message || "Details saved.");
      }

      resetFbForm();
      await loadFacebookDetails();
    } catch (err: any) {
      console.error("Save facebook detail error:", err);
      setFbError(
        err?.response?.data?.message || "Failed to save. Please try again."
      );
    } finally {
      setFbSaving(false);
    }
  };

  // ==========================
  // Edit facebook detail
  // ==========================
  const handleFbEdit = (detail: FacebookDetail) => {
    setFbEditingId(detail._id);
    setFbEmail(detail.email || "");
    setFbLabel(detail.label || "");
    setFbPassword(""); // password cannot be read back
    setFbError("");
    setFbSuccess("");
  };

  // ==========================
  // Delete facebook detail
  // ==========================
  const handleFbDelete = async (id: string) => {
    const confirmDelete = window.confirm("Delete this Facebook detail?");
    if (!confirmDelete) return;

    setFbError("");
    setFbSuccess("");

    try {
      const { data } = await apiClient.delete(`/api/facebook-details/${id}`);
      setFacebookDetails((prev) => prev.filter((d) => d._id !== id));
      setFbSuccess(data?.message || "Deleted.");
      if (fbEditingId === id) {
        resetFbForm();
      }
    } catch (err: any) {
      console.error("Delete facebook detail error:", err);
      setFbError(
        err?.response?.data?.message ||
          "Failed to delete Facebook detail. Please try again."
      );
    }
  };

  // ==========================
  // React Table for Leads
  // ==========================
  const columns = useMemo<ColumnDef<Lead>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => info.getValue() as string,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: (info) => (info.getValue() as string) || "-",
      },
      {
        accessorKey: "contactPreference",
        header: "Contact",
        cell: (info) => {
          const v = info.getValue() as Lead["contactPreference"];
          return v ? v.charAt(0).toUpperCase() + v.slice(1) : "-";
        },
      },
      {
        accessorKey: "facebookLink",
        header: "Facebook",
        cell: (info) => {
          const link = info.getValue() as string | undefined;
          return link ? (
            <a
              href={link}
              className="text-blue-600 hover:underline break-all"
              target="_blank"
              rel="noreferrer"
            >
              Link
            </a>
          ) : (
            "-"
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: (info) => {
          const createdAt = info.getValue() as string | undefined;
          return createdAt ? new Date(createdAt).toLocaleString() : "-";
        },
      },
      {
        id: "actions",
        header: "Action",
        cell: ({ row }) => {
          const lead = row.original;
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleEdit(lead)}
                className="text-xs md:text-sm px-2 py-1 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(lead._id)}
                className="text-xs md:text-sm px-2 py-1 rounded-md border border-red-500 text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          );
        },
      },
    ],
    [handleDelete, handleEdit]
  );

  const table = useReactTable({
    data: leads,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <div className="w-full space-y-6">
      {/* ================= FACEBOOK DETAILS FORM + TABLE ================= */}
      <form
        onSubmit={handleFbSubmit}
        className="w-full bg-white/90 rounded-xl shadow-md p-4 md:p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg md:text-xl font-semibold">
            {fbEditingId ? "Edit Facebook Details" : "Facebook Details"}
          </h2>
          {fbEditingId && (
            <button
              type="button"
              onClick={resetFbForm}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              Cancel edit
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          Saves your own Facebook email and password securely (password is
          hashed on the server). Do not use this to collect other people&apos;s
          login details.
        </p>

        {fbError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {fbError}
          </div>
        )}
        {fbSuccess && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {fbSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email *</label>
            <input
              type="email"
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              value={fbEmail}
              onChange={(e) => setFbEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              Password {fbEditingId ? "(leave blank to keep current)" : "*"}
            </label>
            <div className="relative">
              <input
                type={fbShowPassword ? "text" : "password"}
                className="border rounded-md px-3 py-2 w-full pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={fbPassword}
                onChange={(e) => setFbPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setFbShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-gray-600 hover:text-gray-900"
              >
                {fbShowPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Label */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Label (optional)</label>
            <input
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Main account"
              value={fbLabel}
              onChange={(e) => setFbLabel(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={fbSaving}
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {fbSaving
              ? fbEditingId
                ? "Updating..."
                : "Saving..."
              : fbEditingId
              ? "Update Details"
              : "Save Details"}
          </button>
        </div>

        {/* Facebook details table */}
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">Saved Facebook Details</h3>
          {loadingFacebookDetails ? (
            <div className="text-sm text-gray-500">
              Loading facebook details...
            </div>
          ) : !facebookDetails.length ? (
            <div className="text-sm text-gray-500">
              No facebook details saved yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-3 py-2">Email</th>
                    <th className="text-left px-3 py-2">Label</th>
                    <th className="text-left px-3 py-2">Created</th>
                    <th className="text-left px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {facebookDetails.map((d) => (
                    <tr key={d._id} className="border-b last:border-0">
                      <td className="px-3 py-2 break-all">{d.email}</td>
                      <td className="px-3 py-2">{d.label || "-"}</td>
                      <td className="px-3 py-2">
                        {d.createdAt
                          ? new Date(d.createdAt).toLocaleString()
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleFbEdit(d)}
                            className="text-xs md:text-sm px-2 py-1 rounded-md border border-blue-500 text-blue-600 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFbDelete(d._id)}
                            className="text-xs md:text-sm px-2 py-1 rounded-md border border-red-500 text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </form>

      {/* ================= LEAD FORM ================= */}
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white/90 rounded-xl shadow-md p-4 md:p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg md:text-xl font-semibold">
            {editingId ? "Edit Lead" : "Add New Lead"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetLeadForm}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              Cancel edit
            </button>
          )}
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Name *</label>
            <input
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email *</label>
            <input
              type="email"
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Phone</label>
            <input
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {/* Contact Preference */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Preferred Contact</label>
            <select
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={contactPreference}
              onChange={(e) =>
                setContactPreference(
                  e.target.value as "whatsapp" | "telegram" | ""
                )
              }
            >
              <option value="">Select</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>

          {/* Facebook Link */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm font-medium">
              Facebook Profile / Link
            </label>
            <input
              className="border rounded-md px-3 py-2 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://facebook.com/username"
              value={facebookLink}
              onChange={(e) => setFacebookLink(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving
              ? editingId
                ? "Updating..."
                : "Saving..."
              : editingId
              ? "Update Lead"
              : "Save Lead"}
          </button>
        </div>
      </form>

      {/* ================= LEADS TABLE + PAGINATION ================= */}
      <div className="w-full bg-white/90 rounded-xl shadow-md p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h3 className="text-lg font-semibold">Leads</h3>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!leads.length}
            className="px-3 py-1.5 rounded-md text-xs md:text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>

        {loadingLeads ? (
          <div className="text-sm text-gray-500">Loading leads...</div>
        ) : !leads.length ? (
          <div className="text-sm text-gray-500">No leads yet.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b bg-gray-50">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="text-left px-3 py-2">
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
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-3 py-2">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <span>Rows per page:</span>
                <select
                  className="border rounded-md px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={pageSize}
                  onChange={(e) =>
                    table.setPageSize(Number(e.target.value) || 10)
                  }
                >
                  {[5, 10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm">
                <span>
                  Page {pageIndex + 1} of {table.getPageCount() || 1}
                </span>
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FacebookLeadForm;
