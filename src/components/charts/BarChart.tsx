import type { ChartData, ChartOptions } from "chart.js";
import type React from "react";
import { Bar } from "react-chartjs-2";

interface BarChartProps {
	title?: string;
	data: ChartData<"bar">;
	stacked?: boolean;
	horizontal?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
	title,
	data,
	stacked = false,
	horizontal = false,
}) => {
	const options: ChartOptions<"bar"> = {
		indexAxis: horizontal ? "y" : "x",
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: "top",
			},
			title: {
				display: !!title,
				text: title,
			},
		},
		scales: {
			x: {
				stacked,
			},
			y: {
				beginAtZero: true,
				stacked,
			},
		},
	};

	return (
		<div className={`relative min-w-0 w-full ${horizontal ? "h-80" : "h-72"}`}>
			<Bar data={data} options={options} />
		</div>
	);
};

export default BarChart;
