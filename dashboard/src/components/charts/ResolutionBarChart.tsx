import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ResolutionBarChartProps {
  data: { name: string; ticketsResolved: number; avgTime: number }[];
}

export function ResolutionBarChart({ data }: ResolutionBarChartProps) {
  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-300">
        Avg Resolution Time by Agent (min)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
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
          <Bar dataKey="avgTime" fill="#A855F7" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
