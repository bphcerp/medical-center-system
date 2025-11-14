import { useEffect, useState } from "react";

export function getWindowSize() {
	return {
		width: window.innerWidth,
		height: window.innerHeight,
	};
}

export function useWindowSize() {
	const [windowSize, setWindowSize] = useState(getWindowSize());

	useEffect(() => {
		function handleResize() {
			setWindowSize(getWindowSize());
		}

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return windowSize;
}

const breakpoints: Record<string, number> = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
};

export function useWindowWidthAtLeast(breakpoint: "sm" | "md" | "lg" | "xl") {
	const { width } = useWindowSize();

	return width >= breakpoints[breakpoint];
}
