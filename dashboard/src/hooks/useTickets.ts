import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import type { Ticket } from "../types";

interface UseTicketsOptions {
  assignedTo?: number;
  status?: string;
  limit?: number;
  page?: number;
}

interface TicketsResponse {
  rows: Ticket[];
  count: number;
}

export function useTickets(options?: UseTicketsOptions) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (options?.assignedTo) params.set("assignedTo", String(options.assignedTo));
      if (options?.status) params.set("status", options.status);
      params.set("limit", String(limit));
      params.set("offset", String((page - 1) * limit));

      const res = await api.get<TicketsResponse>(`/tickets?${params.toString()}`);
      setTickets(res.data.rows ?? res.data);
      setTotal(res.data.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [options?.assignedTo, options?.status, limit, page]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const updateTicketStatus = useCallback(async (id: number, status: string) => {
    const res = await api.patch<Ticket>(`/tickets/${id}`, { status });
    setTickets((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    return res.data;
  }, []);

  const assignTicket = useCallback(async (id: number, userId: number) => {
    const res = await api.patch<Ticket>(`/tickets/${id}`, { assignedTo: userId });
    setTickets((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    return res.data;
  }, []);

  const totalPages = Math.ceil(total / limit);

  return { tickets, total, totalPages, loading, error, refetch: fetchTickets, updateTicketStatus, assignTicket };
}
