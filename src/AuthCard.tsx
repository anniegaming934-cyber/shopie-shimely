// src/AuthCard.tsx
import React, { useState, useEffect } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface AuthCardProps {
  onAuthSuccess: (username: string, role?: "admin" | "user") => void;
  initialMode?: "login" | "register";
}

const AuthCard: React.FC<AuthCardProps> = ({
  onAuthSuccess,
  initialMode = "login",
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // If already logged in (token + username), skip straight to dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    const savedUsername = localStorage.getItem("username");
    const savedRole = localStorage.getItem("role") as "admin" | "user" | null;

    if (token && savedUsername) {
      onAuthSuccess(savedUsername, savedRole ?? "user");
    }
  }, [onAuthSuccess]);

  const handleSuccess = (username: string, role?: "admin" | "user") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("username", username);
      if (role) localStorage.setItem("role", role);
    }
    onAuthSuccess(username, role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6">
        {/* Tabs */}
        <div className="flex mb-6 border-b border-slate-200">
          <button
            onClick={() => setMode("login")}
            className={`w-1/2 py-2 text-sm font-semibold transition ${
              mode === "login"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("register")}
            className={`w-1/2 py-2 text-sm font-semibold transition ${
              mode === "register"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Register
          </button>
        </div>

        {/* Forms */}
        {mode === "login" ? (
          <LoginForm
            onSwitchToRegister={() => setMode("register")}
            onSuccess={(username) => handleSuccess(username, "user")}
          />
        ) : (
          <RegisterForm
            onSwitchToLogin={() => setMode("login")}
            onSuccess={(username) => handleSuccess(username, "user")}
          />
        )}
      </div>
    </div>
  );
};

export default AuthCard;
