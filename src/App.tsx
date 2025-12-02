// src/App.tsx
import { useEffect, useState, type FC } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthCard from "./AuthCard";
import UserDashboard from "./user/UserDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import { apiClient } from "./apiConfig";
import NotFoundPage from "./NotFoundPage";

const MainApp: FC = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [username, setUsername] = useState<string>("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [role, setRole] = useState<"user" | "admin">("user");

  // 🔐 Central logout – everything must use this
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");

    setIsAuthed(false);
    setUsername("");
    setRole("user");
  };

  // ✅ On first load: validate token with /api/auth/me
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role") as "admin" | "user" | null;

    if (storedRole === "admin" || storedRole === "user") {
      setRole(storedRole);
    }

    if (!token) {
      setCheckingAuth(false);
      setIsAuthed(false);
      return;
    }

    apiClient
      .get("/api/auth/me")
      .then((res) => {
        const user = res.data?.user;
        const nameFromApi: string =
          user?.name || user?.username || user?.email || "";

        if (!user || !nameFromApi) {
          handleLogout();
          return;
        }

        setUsername(nameFromApi);
        localStorage.setItem("username", nameFromApi);

        if (user.role === "admin" || user.role === "user") {
          setRole(user.role);
          localStorage.setItem("role", user.role);
        }

        setIsAuthed(true);
      })
      .catch((err) => {
        console.error("Auth check failed:", err?.response?.data || err.message);
        handleLogout();
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  // 🧩 Extra safety: if token is cleared elsewhere, force logout
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token" && e.newValue === null) {
        handleLogout();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking your session...</p>
      </div>
    );
  }

  // ❌ Not authenticated → only show AuthCard, NO dashboard, NO forms
  if (!isAuthed) {
    return (
      <AuthCard
        onAuthSuccess={(name: string, nextRole?: "admin" | "user") => {
          setUsername(name);
          localStorage.setItem("username", name);

          if (nextRole) {
            setRole(nextRole);
            localStorage.setItem("role", nextRole);
          }

          setIsAuthed(true);
        }}
      />
    );
  }

  // ✅ Authenticated → show correct dashboard
  return role === "admin" ? (
    <AdminDashboard username={username} onLogout={handleLogout} />
  ) : (
    <UserDashboard username={username} onLogout={handleLogout} />
  );
};

const App: FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* main app (auth + dashboards) */}
        <Route path="/" element={<MainApp />} />

        {/* you can add more routes later, e.g.:
        <Route path="/login" element={<AuthCard ... />} />
        */}

        {/* 🌈 Animated 404 for everything else */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
