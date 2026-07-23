interface OnlineIndicatorProps {
  status: string;
}

const statusConfig: Record<string, { color: string; label: string }> = {
  online: { color: "bg-green-500", label: "Online" },
  away: { color: "bg-yellow-500", label: "Away" },
  break: { color: "bg-orange-500", label: "On Break" },
  offline: { color: "bg-red-500", label: "Offline" },
};

export function OnlineIndicator({ status }: OnlineIndicatorProps) {
  const config = statusConfig[status] || { color: "bg-gray-500", label: status };
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${config.color} shadow-sm`} />
      <span className="text-sm text-gray-300">{config.label}</span>
    </div>
  );
}
