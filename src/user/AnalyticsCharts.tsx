import React, { FC } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type SimpleDatum = {
  name: string;
  value: number;
};

interface AnalyticsChartsProps {
  title?: string;
  lineData: SimpleDatum[];
  barData: SimpleDatum[];
  pieData: SimpleDatum[];
  lineLabel?: string;
  barLabel?: string;
  pieLabel?: string;
}

const PIE_COLORS = ["#0ea5e9", "#22c55e", "#f97316", "#ec4899", "#6366f1"];

const AnalyticsCharts: FC<AnalyticsChartsProps> = ({
  title = "Analytics Overview",
  lineData,
  barData,
  pieData,
  lineLabel = "Line",
  barLabel = "Bar",
  pieLabel = "Share",
}) => {
  return (
    <section className="bg-white rounded-xl shadow-md border border-slate-200 p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-800">
          {title}
        </h2>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">
          Charts
        </span>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
        {/* Line Chart */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            {lineLabel}
          </h3>
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={lineLabel}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            {barLabel}
          </h3>
          <div className="h-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  name={barLabel}
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="h-64">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            {pieLabel}
          </h3>
          <div className="h-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={35}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalyticsCharts;
