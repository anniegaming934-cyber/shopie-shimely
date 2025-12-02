// src/Sidebar.tsx
import { FC, ElementType, useState } from "react";
import {
  LayoutDashboard,
  Gamepad2,
  Wallet,
  Settings,
  Coins,
  LogOut,
  User,
  BarChart2,
  Shield,
  ChevronLeft,
  ChevronRight,
  Info,
  LogIn,
  UserRoundPlus,
  CalendarDays,
  Calculator,
  Gamepad,
  FileUser,
} from "lucide-react";

export type SidebarSection =
  | "overview"
  | "games"
  | "charts"
  | "UserAdminTable"
  | "userHistroy"
  | "depositRecord"
  | "paymentsHistory"
  | "gameEntries"
  | "employeeSalary"
  | "playerinfo"
  | "gameLogins"
  | "schedule"
  | "settings";

type SidebarMode = "admin" | "user";

interface SidebarProps {
  active: SidebarSection;
  onChange: (section: SidebarSection) => void;
  onLogout?: () => void;
  username?: string;
  mode: SidebarMode; // "admin" or "user"
  onModeChange?: (mode: SidebarMode) => void; // toggle callback
}

const Sidebar: FC<SidebarProps> = ({
  active,
  onChange,
  onLogout,
  username,
  mode,
  onModeChange,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  // 👇 Links for user
  const userLinks: { id: SidebarSection; label: string; icon: ElementType }[] =
    [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "games", label: "Games", icon: Gamepad2 },
      { id: "gameEntries", label: "Game Entries", icon: Gamepad },
      { id: "charts", label: "Charts", icon: BarChart2 },
      { id: "paymentsHistory", label: "Payment History", icon: Wallet },
     { id: "gameLogins", label: "Game Logins", icon: LogIn },
      { id: "depositRecord", label: "Deposit Record", icon: FileUser },
      { id: "settings", label: "Settings", icon: Settings },
    ];

  // 👇 Links for admin
  const adminLinks: { id: SidebarSection; label: string; icon: ElementType }[] =
    [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "games", label: "Games", icon: Gamepad2 },
      { id: "charts", label: "Charts", icon: BarChart2 },
      { id: "UserAdminTable", label: "UserAdmin Table", icon: User },
      { id: "playerinfo", label: "Player Info", icon: Info },
      { id: "gameLogins", label: "Game Logins", icon: LogIn },
      { id: "userHistroy", label: "User History", icon: Calculator },
      { id: "employeeSalary", label: "Salary Sheet", icon: UserRoundPlus },
      { id: "schedule", label: "Schedule Sheet", icon: CalendarDays },
      { id: "settings", label: "Settings", icon: Settings },
    ];

  const links = mode === "admin" ? adminLinks : userLinks;

  const toggleCollapsed = () => setCollapsed((c) => !c);

  return (
    <aside
      className={`h-screen bg-slate-900 text-slate-100 flex flex-col shadow-xl transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand / Logo + collapse toggle */}
      <div className="relative flex items-center gap-2 px-5 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-800">
            <Coins className="w-5 h-5 text-yellow-400" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                Shopie-Smiely
              </h1>
              <p className="text-xs text-slate-400">
                {mode === "admin" ? "Admin dashboard" : "Game coins dashboard"}
              </p>
            </div>
          )}
        </div>

        {/* 👇 floating round toggle button */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className={`absolute -right-3 top-1/2 -translate-y-1/2 
      w-6 h-6 flex items-center justify-center rounded-full 
      bg-slate-800 border border-slate-700 shadow-lg
      text-slate-200 hover:text-white hover:bg-slate-700 transition`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* User Info */}
      {username && !collapsed && (
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 bg-slate-800/40">
          <div className="p-2 rounded-lg bg-slate-700">
            <User className="w-4 h-4 text-slate-200" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">{username}</p>
            <p className="text-xs text-slate-400">
              {mode === "admin" ? "Admin logged in" : "Logged in"}
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {/* 🔁 User/Admin section (mode toggle) */}
        {onModeChange && (
          <div className="mb-3 px-1">
            {!collapsed && (
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                View as
              </p>
            )}
            <div className="inline-flex items-center rounded-full bg-slate-800 p-1 text-[11px] shadow-inner">
              <button
                type="button"
                onClick={() => onModeChange("user")}
                className={`flex items-center justify-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                  mode === "user"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                {!collapsed && "User"}
              </button>
              <button
                type="button"
                onClick={() => onModeChange("admin")}
                className={`flex items-center justify-center gap-1 px-2.5 py-1 rounded-full transition-all ${
                  mode === "admin"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {!collapsed && "Admin"}
              </button>
            </div>
          </div>
        )}

        {/* Main links */}
        {links.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition
              ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-slate-800 px-3 py-3 space-y-2">
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/80 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        )}
        {!collapsed && (
          <p className="text-[11px] text-slate-500 text-center">
            v1.0 • {mode === "admin" ? "Admin" : "User"} • shopie/smiely
          </p>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
