import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Role = "user" | "admin";

interface AuthContextValue {
  user: string | null;
  role: Role | null;
  token: string | null;
  loading: boolean;
  login: (payload: { username: string; token?: string; role?: Role }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Restore auth state from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("username");
    const storedRole = localStorage.getItem("role") as Role | null;
    const storedToken = localStorage.getItem("token");

    if (storedUser) setUser(storedUser);
    if (storedRole) setRole(storedRole);
    if (storedToken) setToken(storedToken);

    setLoading(false);
  }, []);

  // 🔐 Called when user logs in successfully
  const login = ({
    username,
    token,
    role,
  }: {
    username: string;
    token?: string;
    role?: Role;
  }) => {
    setUser(username);
    localStorage.setItem("username", username);

    if (token) {
      setToken(token);
      localStorage.setItem("token", token);
    }

    if (role) {
      setRole(role);
      localStorage.setItem("role", role);
    }
  };

  // 🚪 Logout clears everything
  const logout = () => {
    setUser(null);
    setRole(null);
    setToken(null);
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ✨ Easy hook
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
