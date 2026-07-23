import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import api from "../../services/api";
import type { Permission } from "../../types";

export default function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setLoading(true);
        const res = await api.get<Permission[]>("/permissions");
        setPermissions(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch permissions");
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  const handleAction = async (id: number, status: "approved" | "denied") => {
    try {
      const res = await api.patch<Permission>(`/permissions/${id}`, { status });
      setPermissions((prev) => prev.map((p) => (p.id === id ? res.data : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permission");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-lg bg-red-900/30 border border-red-800 px-6 py-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Permissions</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage agent break and time-off requests
        </p>
      </div>

      <div className="grid gap-4">
        {permissions.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400 rounded-xl border border-gray-700 bg-gray-800">
            No permission requests found.
          </div>
        ) : (
          permissions.map((perm) => (
            <div
              key={perm.id}
              className="rounded-xl border border-gray-700 bg-gray-800 p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
                    {perm.requester.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      {perm.requester.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={perm.status} />
                      <span className="text-sm text-gray-400 capitalize">
                        {perm.type}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock className="h-3.5 w-3.5" />
                        {perm.maxDuration} min
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(perm.requestedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {perm.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(perm.id, "approved")}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(perm.id, "denied")}
                      className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Deny
                    </button>
                  </div>
                )}

                {perm.status !== "pending" && perm.approver && (
                  <div className="text-right text-sm text-gray-400">
                    <p>
                      {perm.status === "approved" ? "Approved" : "Denied"} by{" "}
                      {perm.approver.name}
                    </p>
                    {perm.approvedAt && (
                      <p className="text-xs text-gray-500">
                        {new Date(perm.approvedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
