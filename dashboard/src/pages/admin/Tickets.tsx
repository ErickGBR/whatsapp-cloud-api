import { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { useTickets } from "../../hooks/useTickets";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Pagination } from "../../components/ui/Pagination";
import type { Ticket } from "../../types";

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PAGE_SIZE = 15;

export default function AdminTickets() {
  const [page, setPage] = useState(1);
  const { tickets, total, totalPages, loading, error, updateTicketStatus, assignTicket } = useTickets({ limit: PAGE_SIZE, page });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Reset to page 1 when filters change
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); };
  const handleStatusFilterChange = (val: string) => { setStatusFilter(val); setPage(1); };

  const filteredTickets = useMemo(() => {
    return tickets
      .filter((t) => {
        if (statusFilter !== "all" && t.status !== statusFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          String(t.id).includes(q) ||
          t.customerPhone.toLowerCase().includes(q) ||
          (t.customerName?.toLowerCase() || "").includes(q) ||
          (t.subject?.toLowerCase() || "").includes(q)
        );
      })
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [tickets, search, statusFilter]);

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
        <h1 className="text-2xl font-bold text-white">All Tickets</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage and assign support tickets
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Assigned To</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                onClick={() => setSelectedTicket(ticket)}
              >
                <td className="px-4 py-3 font-medium text-white">#{ticket.id}</td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-white">{ticket.customerName || "Unknown"}</p>
                    <p className="text-xs text-gray-500">{ticket.customerPhone}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate">
                  {ticket.subject || "-"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ticket.priority === "urgent"
                        ? "bg-red-900/50 text-red-300"
                        : ticket.priority === "high"
                          ? "bg-orange-900/50 text-orange-300"
                          : ticket.priority === "medium"
                            ? "bg-yellow-900/50 text-yellow-300"
                            : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {ticket.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300">
                  {ticket.assignee?.name || "Unassigned"}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={ticket.status}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateTicketStatus(ticket.id, e.target.value);
                    }}
                    className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredTickets.length === 0 && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            No tickets found matching your filters.
          </div>
        )}
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
