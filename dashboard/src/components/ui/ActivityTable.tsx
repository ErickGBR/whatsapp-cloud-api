import type { ActivityLog } from "../../types";

interface ActivityTableProps {
  activities: ActivityLog[];
  loading?: boolean;
}

export function ActivityTable({ activities, loading }: ActivityTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        No activity records found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400">
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Details</th>
            <th className="px-4 py-3 font-medium">Ticket</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((log) => (
            <tr key={log.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="px-4 py-3 text-gray-300">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-white">{log.user.name}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-purple-900/30 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                  {log.action}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-300 max-w-xs truncate">
                {log.details || "-"}
              </td>
              <td className="px-4 py-3">
                {log.ticketId ? (
                  <span className="text-purple-400">#{log.ticketId}</span>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
