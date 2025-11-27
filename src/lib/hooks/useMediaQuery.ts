import { useEffect, useLayoutEffect, useState } from "react";

export const useIsomorphicLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

type UseMediaQueryOptions = {
	defaultValue?: boolean;
	initializeWithValue?: boolean;
};

const IS_SERVER = typeof window === "undefined";

export function useMediaQuery(
	query: string,
	{
		defaultValue = false,
		initializeWithValue = true,
	}: UseMediaQueryOptions = {},
): boolean {
	const getMatches = (query: string): boolean => {
		if (IS_SERVER) {
			return defaultValue;
		}
		return window.matchMedia(query).matches;
	};

	const [matches, setMatches] = useState<boolean>(() => {
		if (initializeWithValue) {
			return getMatches(query);
		}
		return defaultValue;
	});

	// Handles the change event of the media query.
	function handleChange() {
		setMatches(getMatches(query));
	}

	useIsomorphicLayoutEffect(() => {
		handleChange();
	}, [query]);

	return matches;
}

export type MediaQueryBreakpoints = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export const useBreakpoint: () => MediaQueryBreakpoints = () => {
	const is2xl = useMediaQuery("(min-width: 1536px)");
	const isXl = useMediaQuery("(min-width: 1280px)");
	const isLg = useMediaQuery("(min-width: 1024px)");
	const isMd = useMediaQuery("(min-width: 768px)");
	const isSm = useMediaQuery("(min-width: 640px)");

	if (is2xl) return "2xl";
	if (isXl) return "xl";
	if (isLg) return "lg";
	if (isMd) return "md";
	if (isSm) return "sm";
	return "xs";
};
