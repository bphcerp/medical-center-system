import { redirect } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
import type { ClientResponse } from "hono/client";
import { twMerge } from "tailwind-merge";

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

export const handleErrors = async <
	R extends ClientResponse<unknown, number, "json">,
>(
	res: R,
): Promise<
	R extends ClientResponse<infer T, number, "json">
		? Extract<T, { success: true }> | undefined
		: never
> => {
	let json: unknown = null;
	try {
		json = await res.json();
	} catch {
		alert("An unexpected error occurred. Please try again.");
		return undefined as never;
	}

	if (!json) {
		alert("An unexpected error occurred. Please try again.");
		return undefined as never;
	}

	if (
		typeof json === "object" &&
		json !== null &&
		"success" in json &&
		json.success
	) {
		return json as never;
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
			if (typeof json === "object" && json !== null && "error" in json) {
				const errorJson = json as { error: { message: string } };
				alert(`Error: ${errorJson.error.message}`);
			}
	}
	return undefined as never;
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
