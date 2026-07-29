import { useState, useEffect } from "react";
import { ActivityTable } from "../../components/ui/ActivityTable";
import { Pagination } from "../../components/ui/Pagination";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import type { ActivityLog } from "../../types";

interface ActivitiesResponse {
  rows: ActivityLog[];
  count: number;
}

const PAGE_SIZE = 15;

export default function SupportActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMyActivity = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({
          userId: String(user.id),
          limit: String(PAGE_SIZE),
          offset: String((page - 1) * PAGE_SIZE),
        });
        const res = await api.get<ActivitiesResponse>(`/activity?${params.toString()}`);
        const data = res.data;
        setActivities(data.rows ?? data);
        setTotal(data.count ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch activity");
      } finally {
        setLoading(false);
      }
    };
    fetchMyActivity();
  }, [user, page]);

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
        <h1 className="text-2xl font-bold text-white">My Activity</h1>
        <p className="mt-1 text-sm text-gray-400">
          Your recent actions and changes
        </p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800">
        <ActivityTable activities={activities} loading={loading} />
        <Pagination
          page={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
