import type React from "react";
import { List } from "react-virtualized";

const useVirtualList = <T,>(height: number, rowHeight: number) => {
	const rowRenderer =
		(
			data: T[],
			Component: (
				key: string,
				item: T,
				style: React.CSSProperties,
			) => React.ReactNode,
		) =>
		({
			index,
			key,
			style,
		}: {
			index: number;
			key: string;
			style: React.CSSProperties;
		}) => {
			return Component(key, data[index], style);
		};

	const renderList = (
		data: T[],
		Component: (
			key: string,
			item: T,
			style: React.CSSProperties,
		) => React.ReactNode,
		width: number,
	) => {
		return (
			<List
				width={width}
				height={height}
				rowHeight={rowHeight}
				rowCount={data.length}
				rowRenderer={rowRenderer(data, Component)}
				overscanRowCount={15}
			/>
		);
	};

	return { renderList };
};

export default useVirtualList;
