import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, AlertCircle } from "lucide-react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
import type { Ticket } from "../../types";

export default function MyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const params = new URLSearchParams({ assignedTo: String(user.id) });
        const res = await api.get<Ticket[]>(`/tickets?${params.toString()}`);
        setTickets(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch tickets");
      } finally {
        setLoading(false);
      }
    };

    const fetchQueueCount = async () => {
      try {
        const res = await api.get<{ count: number }>("/tickets/queue/count");
        setQueueCount(res.data.count);
      } catch {
        // Queue count is optional
      }
    };

    fetchTickets();
    fetchQueueCount();
  }, [user]);

  const maxTickets = 10;
  const filteredTickets =
    statusFilter === "all"
      ? tickets
      : tickets.filter((t) => t.status === statusFilter);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Tickets</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your assigned support tickets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Queue badge */}
          {queueCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-orange-900/30 border border-orange-800 px-3 py-2">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-orange-300">
                {queueCount} in queue
              </span>
            </div>
          )}

          {/* Ticket limit */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2">
            <MessageSquare className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-300">
              {tickets.length}/{maxTickets}
            </span>
          </div>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {["all", "open", "assigned", "in_progress", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Tickets grid */}
      <div className="grid gap-4">
        {filteredTickets.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-gray-400 rounded-xl border border-gray-700 bg-gray-800">
            No tickets assigned to you.
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => navigate(`/support/tickets/${ticket.id}`)}
              className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 p-4 hover:border-purple-600/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-2 w-2 rounded-full ${
                      ticket.needsHelp
                        ? "bg-red-500 animate-pulse"
                        : "bg-green-500"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">
                        {ticket.customerName || ticket.customerPhone}
                      </h3>
                      <StatusBadge status={ticket.status} />
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ticket.priority === "urgent"
                            ? "bg-red-900/50 text-red-300"
                            : ticket.priority === "high"
                              ? "bg-orange-900/50 text-orange-300"
                              : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">
                      {ticket.subject || "No subject"}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>{ticket.customerPhone}</span>
                      <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                      {ticket.messages && (
                        <span>{ticket.messages.length} messages</span>
                      )}
                    </div>
                  </div>
                </div>

                {ticket.needsHelp && (
                  <div className="flex items-center gap-1 rounded-full bg-red-900/30 px-2.5 py-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" />
                    Needs Help
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
