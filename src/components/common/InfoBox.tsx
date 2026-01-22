import { ReactNode } from "react";

interface InfoBoxProps {
  title: string;
  value: string | number;
  icon: string;
  color?: "info" | "success" | "warning" | "danger" | "primary" | "secondary";
  progress?: {
    value: number;
    description?: string;
  };
  iconBg?: string;
}

/**
 * AdminLTE Info Box component
 * Displays statistics with icon and optional progress bar
 */
export function InfoBox({
  title,
  value,
  icon,
  color = "info",
  progress,
  iconBg,
}: InfoBoxProps) {
  // AdminLTE 4 uses Bootstrap 5 utility classes: text-bg-{color}
  const bgClass = iconBg || `text-bg-${color}`;

  return (
    <div className="info-box">
      <span className={`info-box-icon ${bgClass} shadow-sm`}>
        <i className={icon}></i>
      </span>
      <div className="info-box-content">
        <span className="info-box-text">{title}</span>
        <span className="info-box-number">{value}</span>
        {progress && (
          <div className="progress">
            <div
              className="progress-bar"
              style={{ width: `${progress.value}%` }}
            ></div>
          </div>
        )}
        {progress?.description && (
          <span className="progress-description">{progress.description}</span>
        )}
      </div>
    </div>
  );
}
