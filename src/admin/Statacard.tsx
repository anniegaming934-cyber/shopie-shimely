import React, { type FC } from "react";

// ===================================
// 1. TYPE DEFINITIONS
// ===================================

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  // Defines border, background, and text colors for styling
  colorClass: { border: string; bg: string; text: string };
  description: string;
}

// ===================================
// 2. STATCARD COMPONENT
// ===================================

/**
 * A reusable card component for displaying a key performance metric.
 * It features dynamic colors, an icon, and a descriptive subtitle.
 */
const StatCard: FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  colorClass,
  description,
}) => (
  // Use a dynamic border-t color based on the metric's focus
  <div
    className="bg-white p-5 rounded-xl shadow-lg border-t-4 border-solid transition duration-300 hover:shadow-2xl"
    style={{ borderColor: colorClass.border }}
  >
    <div className="flex items-center justify-between">
      {/* Icon with colored background */}
      <div
        className={`text-3xl p-3 rounded-full shadow-md ${colorClass.bg} ${colorClass.text}`}
      >
        <Icon size={24} />
      </div>
      {/* Title */}
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </p>
    </div>

    <div className="mt-4">
      {/* Main Metric Value */}
      <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
      {/* Description / Context */}
      <p className="text-xs text-gray-500 mt-1 truncate">{description}</p>
    </div>
  </div>
);

export default StatCard;
