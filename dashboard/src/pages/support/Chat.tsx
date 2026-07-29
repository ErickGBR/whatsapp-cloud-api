import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Send,
  HelpCircle,
  CheckCircle,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";
import { useSocketEvent, useSocketEmit } from "../../hooks/useSocket";
import api from "../../services/api";
import type { Ticket, TicketMessage } from "../../types";

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { emit } = useSocketEmit();

  useEffect(() => {
    if (!id) return;

    const fetchTicket = async () => {
      try {
        setLoading(true);
        const res = await api.get<Ticket>(`/tickets/${id}`);
        setTicket(res.data);
        setMessages(res.data.messages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch ticket");
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [id]);

  // Real-time messages
  useSocketEvent<TicketMessage>(`ticket:${id}:message`, (msg) => {
    setMessages((prev) => [...prev, msg]);
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !id) return;

    try {
      setSending(true);
      const res = await api.post<TicketMessage>(`/tickets/${id}/messages`, {
        content: newMessage.trim(),
        sender: "support",
      });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
      emit("ticket:message", { ticketId: Number(id), message: res.data });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleRequestHelp = async () => {
    if (!id) return;
    try {
      await api.patch(`/tickets/${id}`, { needsHelp: true });
      setTicket((prev) => (prev ? { ...prev, needsHelp: true } : prev));
      emit("ticket:needs-help", { ticketId: Number(id) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request help");
    }
  };

  const handleResolve = async () => {
    if (!id) return;
    try {
      await api.patch(`/tickets/${id}`, { status: "resolved" });
      setTicket((prev) =>
        prev ? { ...prev, status: "resolved" } : prev
      );
      emit("ticket:status", { ticketId: Number(id), status: "resolved" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve ticket");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="rounded-lg bg-red-900/30 border border-red-800 px-6 py-4 text-red-400">
          {error || "Ticket not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Customer info header */}
      <div className="flex items-center justify-between rounded-t-xl border border-gray-700 bg-gray-800 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
            {(ticket.customerName || ticket.customerPhone).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-medium text-white">
              {ticket.customerName || "Unknown Customer"}
            </h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {ticket.customerPhone}
              </span>
              {ticket.subject && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {ticket.subject}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.needsHelp && (
            <span className="flex items-center gap-1 rounded-full bg-red-900/30 px-3 py-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3" />
              Help Requested
            </span>
          )}
          <button
            onClick={handleRequestHelp}
            disabled={ticket.needsHelp}
            className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Request Help
          </button>
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <button
              onClick={handleResolve}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark Resolved
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto border-x border-gray-700 bg-gray-800/50 px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No messages yet. Start the conversation.
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "support" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                    msg.sender === "support"
                      ? "bg-purple-600 text-white"
                      : msg.sender === "ai"
                        ? "bg-gray-700 text-gray-200"
                        : "bg-gray-700/50 text-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium opacity-70">
                      {msg.sender === "support"
                        ? "You"
                        : msg.sender === "ai"
                          ? "AI Assistant"
                          : "Customer"}
                    </span>
                    <span className="text-xs opacity-50">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="rounded-b-xl border border-gray-700 bg-gray-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="rounded-lg bg-purple-600 p-2.5 text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
