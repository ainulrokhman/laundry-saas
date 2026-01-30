"use client";

import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ChartOptions,
  ChartData,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface RevenueChartProps {
  data: {
    date: string;
    count: number;
    revenue: number;
  }[];
  title?: string;
  type?: "line" | "bar";
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  title = "Statistik Pendapatan",
  type = "line",
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Format date labels for mobile (shorter)
  const formatLabel = (dateStr: string) => {
    if (isMobile) {
      // Show only day/month on mobile
      const date = new Date(dateStr);
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
    return dateStr;
  };

  const chartData: ChartData<"line" | "bar"> = {
    labels: data.map((d) => formatLabel(d.date)),
    datasets: [
      {
        label: isMobile ? "Pendapatan" : "Pendapatan (IDR)",
        data: data.map((d) => d.revenue),
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.2)",
        yAxisID: "y",
        fill: true,
        tension: 0.4,
        borderWidth: isMobile ? 2 : 3,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
      {
        label: "Pesanan",
        data: data.map((d) => d.count),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        yAxisID: "y1",
        type: "line" as const,
        tension: 0.4,
        borderWidth: isMobile ? 2 : 3,
        pointRadius: isMobile ? 2 : 4,
        pointHoverRadius: isMobile ? 4 : 6,
      },
    ],
  };

  const options: ChartOptions<"line" | "bar"> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: isMobile ? 1.2 : 2,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      title: {
        display: !!title && !isMobile,
        text: title,
        font: {
          size: isMobile ? 12 : 14,
          weight: "bold",
        },
        padding: {
          top: 10,
          bottom: isMobile ? 10 : 20,
        },
      },
      legend: {
        display: true,
        position: isMobile ? "bottom" : "top",
        align: "center",
        labels: {
          boxWidth: isMobile ? 12 : 40,
          boxHeight: isMobile ? 12 : 20,
          padding: isMobile ? 8 : 20,
          font: {
            size: isMobile ? 11 : 12,
          },
          usePointStyle: isMobile,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          size: isMobile ? 12 : 14,
        },
        bodyFont: {
          size: isMobile ? 11 : 13,
        },
        padding: isMobile ? 8 : 12,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;
            if (label.includes("Pendapatan")) {
              return `${label}: Rp ${value.toLocaleString("id-ID")}`;
            }
            return `${label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: isMobile ? 9 : 11,
          },
          maxRotation: isMobile ? 45 : 0,
          minRotation: isMobile ? 45 : 0,
          autoSkip: true,
          maxTicksLimit: isMobile ? 7 : 15,
        },
        grid: {
          display: !isMobile,
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        title: {
          display: !isMobile,
          text: "Pendapatan",
          font: {
            size: 11,
          },
        },
        ticks: {
          font: {
            size: isMobile ? 9 : 11,
          },
          callback: function (value) {
            const num = Number(value);
            if (isMobile) {
              if (num >= 1000000) return `${(num / 1000000).toFixed(1)}jt`;
              if (num >= 1000) return `${(num / 1000).toFixed(0)}rb`;
            }
            return num.toLocaleString("id-ID");
          },
          maxTicksLimit: isMobile ? 5 : 8,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      y1: {
        type: "linear" as const,
        display: !isMobile, // Hide second y-axis on mobile
        position: "right" as const,
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: !isMobile,
          text: "Pesanan",
          font: {
            size: 11,
          },
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
    },
  };

  return (
    <div
      className="chart-container"
      style={{
        position: "relative",
        width: "100%",
        minHeight: isMobile ? "280px" : "350px",
        padding: isMobile ? "8px 0" : "16px 0",
      }}
    >
      {/* Mobile Title */}
      {isMobile && title && (
        <h6
          className="text-center mb-2"
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          {title}
        </h6>
      )}

      {type === "bar" ? (
        <Bar
          data={chartData as ChartData<"bar">}
          options={options as ChartOptions<"bar">}
        />
      ) : (
        <Line
          data={chartData as ChartData<"line">}
          options={options as ChartOptions<"line">}
        />
      )}

      {/* Mobile hint */}
      {isMobile && (
        <p
          className="text-center mt-2 mb-0"
          style={{
            fontSize: "10px",
            color: "#9CA3AF",
          }}
        >
          Tap untuk melihat detail
        </p>
      )}
    </div>
  );
};
