import type { ChartData, ChartOptions } from "chart.js";
import type React from "react";
import { Line } from "react-chartjs-2";

interface LineChartProps {
	title?: string;
	data: ChartData<"line">;
	smooth?: boolean;
	fill?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
	title,
	data,
	smooth = false,
	fill = false,
}) => {
	const options: ChartOptions<"line"> = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { position: "top" },
			title: {
				display: !!title,
				text: title,
			},
		},
		elements: {
			line: {
				tension: smooth ? 0.4 : 0,
				borderWidth: 2,
				fill: fill,
			},
			point: {
				radius: 4,
				hoverRadius: 6,
			},
		},
		scales: {
			y: { beginAtZero: true },
		},
	};

	return (
		<div className="relative h-72 min-w-0 w-full">
			<Line data={data} options={options} />
		</div>
	);
};

export default LineChart;
