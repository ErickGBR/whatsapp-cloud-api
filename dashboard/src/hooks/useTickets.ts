import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import type { Ticket } from "../types";

interface UseTicketsOptions {
  assignedTo?: number;
  status?: string;
  limit?: number;
}

export function useTickets(options?: UseTicketsOptions) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (options?.assignedTo) params.set("assignedTo", String(options.assignedTo));
      if (options?.status) params.set("status", options.status);
      if (options?.limit) params.set("limit", String(options.limit));

      const res = await api.get<Ticket[]>(`/tickets?${params.toString()}`);
      setTickets(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [options?.assignedTo, options?.status, options?.limit]);

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

  return { tickets, loading, error, refetch: fetchTickets, updateTicketStatus, assignTicket };
}
