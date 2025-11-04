export const debounce = <I, O>(callback: (input: I) => O, wait: number) => {
	let timeoutId: NodeJS.Timeout;
	return (input: I) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			callback(input);
		}, wait);
	};
};
