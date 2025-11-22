import { redirect } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
import type { ClientResponse } from "hono/client";
import { twMerge } from "tailwind-merge";
import type { ApiResponse } from "./types/api";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const debounce = <I, O>(callback: (input: I) => O, wait: number) => {
	let timeoutId: NodeJS.Timeout;
	return (input: I) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			callback(input);
		}, wait);
	};
};

export function titleCase(str: string) {
	return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

type ExtractData<R> = R extends ClientResponse<infer Body, number, "json">
	? Body extends { success: true; data: infer D }
		? D
		: never
	: never;

export const handleErrors = async <
	// Without this any, a template implementation with a generic T would fail because
	// the T would only bind to the most common type, causing the union of all responses to
	// be used and making it impossible to extract the specific data type.
	// With an unknown, the data type becomes completely useless. This way, we have the best
	// of both worlds.
	// biome-ignore lint/suspicious/noExplicitAny: See above comment
	R extends ClientResponse<ApiResponse<any>, number, "json">,
>(
	res: R,
): Promise<ExtractData<R> | undefined> => {
	try {
		const json = await res.json();
		if (json.success) {
			return json.data;
		}

		switch (res.status) {
			case 401:
				window.location.assign("/api/logout");
				break;
			case 403:
				alert("You don't have the permission to perform this action.");
				redirect({ to: "/" });
				break;
			default:
				alert(`Error: ${json.error.message}`);
		}
		return undefined;
	} catch {
		alert("An unexpected error occurred. Please try again.");
		return undefined;
	}
};

export function ageSexString(age?: number, sex?: "male" | "female") {
	const s = sex ? titleCase(sex) : "";
	const a = age !== undefined ? `${age} year${age === 1 ? "" : "s"} old` : "";
	const sep = s && a ? ", " : "";

	return `${s}${sep}${a}`;
}

export const getAge = (birthdate: string) => {
	return Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000);
};
