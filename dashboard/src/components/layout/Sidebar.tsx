import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Users,
  ClipboardList,
  Shield,
  MessageSquare,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface SidebarProps {
  role: "admin" | "support";
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

const adminNav: NavItem[] = [
  { to: "/admin/dashboard", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
  { to: "/admin/tickets", icon: <Ticket className="h-5 w-5" />, label: "Tickets" },
  { to: "/admin/agents", icon: <Users className="h-5 w-5" />, label: "Agents" },
  { to: "/admin/activity", icon: <ClipboardList className="h-5 w-5" />, label: "Activity Logs" },
  { to: "/admin/permissions", icon: <Shield className="h-5 w-5" />, label: "Permissions" },
];

const supportNav: NavItem[] = [
  { to: "/support/tickets", icon: <MessageSquare className="h-5 w-5" />, label: "My Tickets" },
  { to: "/support/activity", icon: <FileText className="h-5 w-5" />, label: "Activity" },
  { to: "/support/report", icon: <AlertTriangle className="h-5 w-5" />, label: "Report Incident" },
];

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const navItems = role === "admin" ? adminNav : supportNav;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-gray-700 bg-gray-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-gray-700 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">WhatsBot</span>
          <span className="rounded bg-purple-900/50 px-1.5 py-0.5 text-xs text-purple-300">
            {role === "admin" ? "Admin" : "Support"}
          </span>
        </div>

        <nav className="mt-4 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
