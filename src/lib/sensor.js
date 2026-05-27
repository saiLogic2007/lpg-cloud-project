/**
 * SafeGuard IoT - Sensor Severity Ratings & Utilities (Plain JS)
 */

export const SEVERITY_LEVELS = {
  Safe: { color: "#22c55e", threshold: 0, label: "All Clear", bg: "bg-green-500/10" },
  Warning: { color: "#eab308", threshold: 200, label: "Elevated Levels", bg: "bg-yellow-500/10" },
  Danger: { color: "#f97316", threshold: 500, label: "Immediate Action Required", bg: "bg-orange-500/10" },
  Critical: { color: "#ef4444", threshold: 800, label: "EVACUATE IMMEDIATELY", bg: "bg-red-500/10" },
};

/**
 * Classifies sensor PPM inputs into safety severity levels
 * @param {number} value MQ-6 Sensor PPM Value
 * @returns {string} Severity label ("Safe" | "Warning" | "Danger" | "Critical")
 */
export const getSeverity = (value) => {
  if (value >= 800) return "Critical";
  if (value >= 500) return "Danger";
  if (value >= 200) return "Warning";
  return "Safe";
};

/**
 * Maps the 10-bit analog PPM scale to a percentage
 * @param {number} value Analog PPM value (0-1023)
 * @returns {number} Integer percentage
 */
export const getRiskPercentage = (value) => {
  return Math.min(100, Math.max(0, Math.round((value / 1000) * 100)));
};
