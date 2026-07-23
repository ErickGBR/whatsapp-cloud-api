import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BreakTimeChartProps {
  data: { name: string; breakCount: number }[];
}

export function BreakTimeChart({ data }: BreakTimeChartProps) {
  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-300">
        Break Count by Agent
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
          <Bar dataKey="breakCount" fill="#F59E0B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
