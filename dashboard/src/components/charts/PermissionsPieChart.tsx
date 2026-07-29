import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface PermissionsPieChartProps {
  data: { type: string; count: number }[];
}

const COLORS = ["#A855F7", "#3B82F6", "#F59E0B", "#10B981"];

export function PermissionsPieChart({ data }: PermissionsPieChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
        <h3 className="mb-4 text-sm font-medium text-gray-300">
          Permissions by Type (Today)
        </h3>
        <div className="flex items-center justify-center h-[280px] text-gray-400">
          No permissions today
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-5">
      <h3 className="mb-4 text-sm font-medium text-gray-300">
        Permissions by Type (Today)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={(entry: any) => `${entry.type}: ${entry.count}`}
            labelLine={{ stroke: "#6B7280" }}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1F2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#F9FAFB",
            }}
          />
          <Legend
            wrapperStyle={{ color: "#9CA3AF", fontSize: "12px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
