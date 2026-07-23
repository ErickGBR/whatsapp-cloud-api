import { Ticket, CheckCircle, Users, Shield } from "lucide-react";
import { MetricCard } from "../../components/ui/MetricCard";
import { OnlineIndicator } from "../../components/ui/OnlineIndicator";
import { TicketsLineChart } from "../../components/charts/TicketsLineChart";
import { ResolutionBarChart } from "../../components/charts/ResolutionBarChart";
import { PermissionsPieChart } from "../../components/charts/PermissionsPieChart";
import { BreakTimeChart } from "../../components/charts/BreakTimeChart";
import { useMetrics } from "../../hooks/useMetrics";
import { useSocketEvent } from "../../hooks/useSocket";
import { useState, useEffect } from "react";
import type { DashboardMetrics } from "../../types";

export default function AdminDashboard() {
  const { metrics, loading, error, refetch } = useMetrics();
  const [liveMetrics, setLiveMetrics] = useState<DashboardMetrics | null>(null);

  useSocketEvent<DashboardMetrics>("metrics:update", (data) => {
    setLiveMetrics(data);
  });

  // Refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const displayMetrics = liveMetrics || metrics;

  if (loading && !displayMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !displayMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-lg bg-red-900/30 border border-red-800 px-6 py-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!displayMetrics) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Real-time overview of support operations
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Ticket className="h-6 w-6" />}
          label="Tickets Today"
          value={displayMetrics.ticketsToday}
        />
        <MetricCard
          icon={<CheckCircle className="h-6 w-6" />}
          label="Resolved Today"
          value={displayMetrics.resolvedToday}
          trend={{ value: 12, positive: true }}
        />
        <MetricCard
          icon={<Users className="h-6 w-6" />}
          label="Active Agents"
          value={displayMetrics.activeSupportAgents}
        />
        <MetricCard
          icon={<Shield className="h-6 w-6" />}
          label="Pending Permissions"
          value={displayMetrics.pendingPermissions}
          trend={{ value: 5, positive: false }}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TicketsLineChart data={displayMetrics.ticketsResolvedByDay} />
        <ResolutionBarChart data={displayMetrics.supportActivity} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PermissionsPieChart data={displayMetrics.permissionsByType} />
        <BreakTimeChart data={displayMetrics.supportActivity} />
      </div>

      {/* Support Agents Online */}
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-300">
          Support Agents Status
        </h3>
        <div className="space-y-3">
          {displayMetrics.supportActivity.map((agent) => (
            <div
              key={agent.userId}
              className="flex items-center justify-between rounded-lg bg-gray-700/50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{agent.name}</p>
                  <OnlineIndicator status={agent.status} />
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="font-medium text-white">{agent.ticketsResolved}</p>
                  <p className="text-xs text-gray-400">Resolved</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-white">{agent.avgTime}m</p>
                  <p className="text-xs text-gray-400">Avg Time</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-white">{agent.breakCount}</p>
                  <p className="text-xs text-gray-400">Breaks</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
