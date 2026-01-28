'use client';

import React from 'react';
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
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface RevenueChartProps {
    data: {
        date: string;
        count: number;
        revenue: number;
    }[];
    title?: string;
    type?: 'line' | 'bar';
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
    data,
    title = 'Statistik Pendapatan',
    type = 'line',
}) => {
    const chartData: ChartData<'line' | 'bar'> = {
        labels: data.map((d) => d.date),
        datasets: [
            {
                label: 'Pendapatan (IDR)',
                data: data.map((d) => d.revenue),
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                yAxisID: 'y',
            },
            {
                label: 'Pesanan',
                data: data.map((d) => d.count),
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                yAxisID: 'y1',
                type: 'line' as const, // Always show orders as line
            },
        ],
    };

    const options: ChartOptions<'line' | 'bar'> = {
        responsive: true,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },

        plugins: {
            title: {
                display: !!title,
                text: title,
            },
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: {
                    display: true,
                    text: 'Pendapatan',
                },
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                grid: {
                    drawOnChartArea: false,
                },
                title: {
                    display: true,
                    text: 'Pesanan',
                },
            },
        },
    };

    return (
        <div className="w-100 h-100" style={{ minHeight: '300px' }}>
            {type === 'bar' ? (
                <Bar data={chartData as ChartData<'bar'>} options={options as ChartOptions<'bar'>} />
            ) : (
                <Line data={chartData as ChartData<'line'>} options={options as ChartOptions<'line'>} />
            )}
        </div>
    );
};
