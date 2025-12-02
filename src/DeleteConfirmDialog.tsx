// src/components/DeleteConfirmDialog.tsx
import React from "react";
import { X, Trash2 } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm relative animate-fadeIn">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
        </div>

        {/* Title & Message */}
        <h2 className="text-lg font-semibold text-gray-800 text-center mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-600 text-center mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex justify-center gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmDialog;
