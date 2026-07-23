import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Bell, LogOut, Coffee } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import { PermissionModal } from "../ui/PermissionModal";

export function SupportLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        role="support"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-700 bg-gray-900 px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setPermissionOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
          >
            <Coffee className="h-4 w-4" />
            Request Break
          </button>

          <div className="flex items-center gap-4">
            <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-purple-500" />
            </button>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.name || "Support"}</p>
                <p className="text-xs text-gray-400">{user?.email || "support@whatsbot.com"}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
                {(user?.name || "S").charAt(0).toUpperCase()}
              </div>
            </div>

            <button
              onClick={logout}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <PermissionModal
        isOpen={permissionOpen}
        onClose={() => setPermissionOpen(false)}
      />
    </div>
  );
}
