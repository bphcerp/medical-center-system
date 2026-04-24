import { useEffect, useState } from "react";

export function useSSE<T>(url: string, event: string, initial: T): T {
	const [data, setData] = useState<T>(initial);

	useEffect(() => {
		const eventSource = new EventSource(url, { withCredentials: true });

		eventSource.addEventListener(event, (e) => {
			setData(JSON.parse((e as MessageEvent).data) as T);
		});

		return () => eventSource.close();
	}, [url, event]);

	return data;
}
