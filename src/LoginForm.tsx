import React, { useState } from "react";
import { apiClient } from "./apiConfig";
import { AxiosError } from "axios";
import { useAuth } from "./AuthContext"; // 👈 IMPORT

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onSuccess: (username: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToRegister,
  onSuccess,
}) => {
  const { login } = useAuth(); // 👈 FROM CONTEXT

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState(""); // 👈 new

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setModalMessage("");

    try {
      const trimmedEmail = email.trim(); // keep case, just remove spaces

      const { data } = await apiClient.post(
        "/api/auth/login",
        { email: trimmedEmail, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const backendRole = data.user?.role as string | undefined;
      const backendIsAdmin = Boolean(data.user?.isAdmin);
      const isAdmin =
        backendIsAdmin ||
        (backendRole && backendRole.toLowerCase() === "admin");

      const role: "admin" | "user" = isAdmin ? "admin" : "user";

      const username = data.user?.name || trimmedEmail.split("@")[0] || "User";

      // ✅ Let AuthContext handle persistence (username, token, role)
      login({
        username,
        token: data.token,
        role,
      });

      // (optional) still store extra flags if you use them elsewhere
      localStorage.setItem("isAdmin", isAdmin ? "1" : "0");
      if (data.user?.email) {
        localStorage.setItem("userEmail", data.user.email);
      } else {
        localStorage.setItem("userEmail", trimmedEmail);
      }

      onSuccess(username);
    } catch (err) {
      const axiosErr = err as AxiosError<any>;
      const rawMessage = axiosErr.response?.data?.message as string | undefined;

      const message =
        rawMessage ||
        `Login failed (${axiosErr.response?.status ?? "unknown"}).`;

      console.error("❌ Login failed:", message);

      const lower = message.toLowerCase();

      // 🔐 Treat all 401 / invalid / case mismatch as modal-type errors
      if (
        axiosErr.response?.status === 401 ||
        lower.includes("invalid credentials") ||
        lower.includes("email case does not match")
      ) {
        // Show a more user-friendly message, but preserve case-mismatch info
        if (lower.includes("email case does not match")) {
          setModalMessage(
            "Email is case-sensitive. Please enter it exactly as you registered (including capital and small letters)."
          );
        } else {
          setModalMessage(
            "Your email or password didn’t match our records. Please try again."
          );
        }
        setShowModal(true);
      } else {
        // Other server/unknown errors → show inline
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 relative">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Welcome Back 👋
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Email{" "}
            <span className="text-[11px] text-slate-500">
              (case-sensitive, use same capital/small letters)
            </span>
          </label>
          <input
            type="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Password
          </label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-2 my-1 px-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-600">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded border-slate-300" />{" "}
            Remember me
          </label>
          <button type="button" className="text-blue-600 hover:underline">
            Forgot password?
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className={`w-full mt-2 rounded-lg py-2 text-sm font-semibold text-white transition ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-xs text-center text-slate-500">
          Don’t have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-blue-600 hover:underline"
          >
            Sign up
          </button>
        </p>
      </form>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80 text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Login Failed
            </h3>
            <p className="text-sm text-slate-700 mb-4">
              {modalMessage ||
                "Your email or password didn’t match our records. Please try again."}
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LoginForm;
