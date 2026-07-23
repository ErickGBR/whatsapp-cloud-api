export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "support";
  active: boolean;
  lastLogin?: string;
  socketStatus: string;
}

export interface Ticket {
  id: number;
  customerPhone: string;
  customerName?: string;
  subject?: string;
  status: "open" | "assigned" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: number;
  assignee?: User;
  createdBy: string;
  needsHelp: boolean;
  createdAt: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  sender: "customer" | "ai" | "support";
  supportUserId?: number;
  content: string;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  userId: number;
  user: User;
  action: string;
  details?: string;
  ticketId?: number;
  createdAt: string;
}

export type PermissionType = "break" | "bathroom" | "eating" | "other";
export type PermissionStatus = "pending" | "approved" | "denied";

export interface Permission {
  id: number;
  userId: number;
  requester: User;
  type: PermissionType;
  requestedAt: string;
  approvedBy?: number;
  approver?: User;
  approvedAt?: string;
  status: PermissionStatus;
  maxDuration: number;
  actualDuration?: number;
}

export interface DashboardMetrics {
  ticketsToday: number;
  resolvedToday: number;
  avgResolutionTime: number;
  activeSupportAgents: number;
  pendingPermissions: number;
  ticketsByStatus: Record<string, number>;
  ticketsResolvedByDay: { date: string; count: number }[];
  permissionsByType: { type: string; count: number }[];
  supportActivity: {
    userId: number;
    name: string;
    ticketsResolved: number;
    avgTime: number;
    breakCount: number;
    status: string;
  }[];
}
