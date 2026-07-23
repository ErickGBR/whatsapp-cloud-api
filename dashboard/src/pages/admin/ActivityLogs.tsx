import { useState, useEffect, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { ActivityTable } from "../../components/ui/ActivityTable";
import api from "../../services/api";
import type { ActivityLog } from "../../types";

export default function ActivityLogs() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const res = await api.get<ActivityLog[]>("/activity");
        setActivities(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch activity logs");
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter((log) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !log.user.name.toLowerCase().includes(q) &&
          !log.action.toLowerCase().includes(q) &&
          !(log.details?.toLowerCase() || "").includes(q)
        ) {
          return false;
        }
      }
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (dateFrom && new Date(log.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.createdAt) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [activities, search, actionFilter, dateFrom, dateTo]);

  // Extract unique action types
  const actionTypes = useMemo(() => {
    return [...new Set(activities.map((a) => a.action))];
  }, [activities]);

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
        <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
        <p className="mt-1 text-sm text-gray-400">
          Track all system actions and changes
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search activities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Actions</option>
            {actionTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-700 bg-gray-800">
        <ActivityTable activities={filteredActivities} loading={loading} />
      </div>
    </div>
  );
}
