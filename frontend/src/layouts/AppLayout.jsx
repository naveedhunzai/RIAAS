import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  FileText,
  CheckSquare,
  Settings,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ingest", label: "Ingest", icon: Upload },
  { to: "/ask", label: "Ask", icon: MessageSquare },
  { to: "/requirements", label: "Requirements", icon: FileText },
  { to: "/actions", label: "Actions", icon: CheckSquare },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="flex">
        <aside className="w-64 border-r bg-white">
          <div className="p-4 border-b">
            <div className="text-lg font-semibold">RIAAS</div>
            <div className="text-xs text-zinc-500">Regulatory Intelligence</div>
          </div>

          <nav className="p-2 space-y-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-100",
                  ].join(" ")
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          <header className="h-14 bg-white border-b flex items-center px-4 justify-between">
            <div className="font-medium">RIAAS Console</div>
            <div className="text-xs text-zinc-500">
              Backend: {import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}
            </div>
          </header>

          <div className="p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

