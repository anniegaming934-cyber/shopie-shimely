// src/GameEntryForm.tsx
import React, { useState } from "react";
import OurTagEntryForm from "./OurTagEntryForm";
import PlayerTagEntryForm from "./PlayerTagEntryForm";

type EntryMode = "our" | "player";

interface GameEntryFormProps {
  username: string; // comes from UserDashboard
}

const GameEntryForm: React.FC<GameEntryFormProps> = ({ username }) => {
  const [entryMode, setEntryMode] = useState<EntryMode>("our");

  // 🔐 HARD AUTH GUARD — do NOT show form if not logged in
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const isAuthed = !!token && !!username;

  if (!isAuthed) {
    return (
      <div className="w-full p-4 md:p-6">
        <div className="border rounded-xl p-6 bg-gray-50 text-center shadow-sm">
          <h2 className="text-lg font-semibold mb-2">
            You cannot fill the form
          </h2>
          <p className="text-sm text-gray-600">
            You are not signed in. Please log in to add game entries.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // IF signed in → show real form
  // ---------------------------------------------------------
  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="w-full rounded-2xl border p-4 md:p-6 shadow-sm bg-white">
        <h2 className="text-lg font-semibold mb-4">Add Game Entry</h2>

        {/* Entry mode toggle */}
        <div className="md:col-span-4 flex flex-wrap items-center gap-3 mb-4">
          <span className="text-sm font-medium">Entry Mode:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEntryMode("our")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                entryMode === "our"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Our Tag
            </button>
            <button
              type="button"
              onClick={() => setEntryMode("player")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                entryMode === "player"
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              Player Tag
            </button>
          </div>
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Username</label>
          <input
            value={username}
            disabled
            className="w-full rounded-lg border px-3 py-2 bg-gray-100 text-gray-600"
            placeholder="Not logged in"
          />
        </div>

        {/* Mode-specific sub-forms */}
        {entryMode === "our" ? (
          <OurTagEntryForm username={username} />
        ) : (
          <PlayerTagEntryForm username={username} />
        )}
      </div>
    </div>
  );
};

export default GameEntryForm;
