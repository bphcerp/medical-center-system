import type { ChartData, ChartOptions } from "chart.js";
import type React from "react";
import { Pie } from "react-chartjs-2";

interface PieChartProps {
	title?: string;
	data: ChartData<"pie">;
	doughnut?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({
	title,
	data,
	doughnut = false,
}) => {
	const options: ChartOptions<"pie"> = {
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
			tooltip: {
				callbacks: {
					label: (context) => {
						const label = context.label || "";
						const value = context.formattedValue || "";
						return `${label}: ${value}`;
					},
				},
			},
		},
		cutout: doughnut ? "50%" : "0%",
	};

	return (
		<div className="relative aspect-square min-w-0 w-full max-w-full">
			<Pie data={data} options={options} />
		</div>
	);
};

export default PieChart;
