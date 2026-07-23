import { useEffect, useState } from "react";
import { OnlineIndicator } from "../../components/ui/OnlineIndicator";
import { useSocketEvent } from "../../hooks/useSocket";
import api from "../../services/api";
import type { User } from "../../types";

interface AgentWithMetrics extends User {
  ticketsResolved?: number;
  avgTime?: number;
  breakCount?: number;
}

export default function Agents() {
  const [agents, setAgents] = useState<AgentWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const res = await api.get<AgentWithMetrics[]>("/users/support");
        setAgents(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch agents");
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, []);

  // Real-time status updates
  useSocketEvent<{ userId: number; status: string }>("agent:status", (data) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === data.userId ? { ...a, socketStatus: data.status } : a
      )
    );
  });

  useSocketEvent<{
    userId: number;
    ticketsResolved: number;
    avgTime: number;
    breakCount: number;
  }>("agent:metrics", (data) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === data.userId
          ? {
              ...a,
              ticketsResolved: data.ticketsResolved,
              avgTime: data.avgTime,
              breakCount: data.breakCount,
            }
          : a
      )
    );
  });

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
        <h1 className="text-2xl font-bold text-white">Support Agents</h1>
        <p className="mt-1 text-sm text-gray-400">
          Real-time agent status and performance metrics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-xl border border-gray-700 bg-gray-800 p-5 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-lg font-medium text-white">
                  {agent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-white">{agent.name}</p>
                  <p className="text-xs text-gray-400">{agent.email}</p>
                </div>
              </div>
            </div>

            <OnlineIndicator status={agent.socketStatus || "offline"} />

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-700 pt-4">
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {agent.ticketsResolved ?? 0}
                </p>
                <p className="text-xs text-gray-400">Resolved</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {agent.avgTime ?? 0}m
                </p>
                <p className="text-xs text-gray-400">Avg Time</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {agent.breakCount ?? 0}
                </p>
                <p className="text-xs text-gray-400">Breaks</p>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  agent.active ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-xs text-gray-400">
                {agent.active ? "Active Account" : "Inactive Account"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="flex items-center justify-center py-12 text-gray-400">
          No support agents found.
        </div>
      )}
    </div>
  );
}
