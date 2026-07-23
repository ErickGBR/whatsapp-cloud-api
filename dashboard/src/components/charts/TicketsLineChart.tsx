import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TicketsLineChartProps {
  data: { date: string; count: number }[];
}

export function TicketsLineChart({ data }: TicketsLineChartProps) {
  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-300">
        Tickets Resolved (Last 7 Days)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            axisLine={{ stroke: "#374151" }}
          />
          <YAxis
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            axisLine={{ stroke: "#374151" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#F9FAFB",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#A855F7"
            strokeWidth={2}
            dot={{ fill: "#A855F7", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
