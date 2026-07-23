import type { ReactNode } from "react";

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; positive: boolean };
}

export function MetricCard({ icon, label, value, trend }: MetricCardProps) {
  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-5 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="rounded-lg bg-purple-500/10 p-3 text-purple-400">
          {icon}
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.positive ? "text-green-400" : "text-red-400"
            }`}
          >
            <svg
              className={`h-4 w-4 ${trend.positive ? "" : "rotate-180"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            {trend.value}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
