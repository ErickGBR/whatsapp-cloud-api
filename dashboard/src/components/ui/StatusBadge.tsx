import type { Ticket } from "../../types";

type StatusVariant = Ticket["status"] | "pending" | "approved" | "denied";

interface StatusBadgeProps {
  status: StatusVariant;
}

const statusStyles: Record<StatusVariant, string> = {
  open: "bg-gray-700 text-gray-300",
  assigned: "bg-blue-900/50 text-blue-300",
  in_progress: "bg-yellow-900/50 text-yellow-300",
  resolved: "bg-green-900/50 text-green-300",
  closed: "bg-slate-700 text-slate-300",
  pending: "bg-orange-900/50 text-orange-300",
  approved: "bg-green-900/50 text-green-300",
  denied: "bg-red-900/50 text-red-300",
};

const statusLabels: Record<StatusVariant, string> = {
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  pending: "Pending",
  approved: "Approved",
  denied: "Denied",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        statusStyles[status] || "bg-gray-700 text-gray-300"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
