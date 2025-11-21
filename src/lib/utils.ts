import { redirect } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";
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

export function handleUnauthorized(status: number) {
	switch (status) {
		case 401:
			throw redirect({
				to: "/login",
			});
		case 403:
			alert("You don't have the permission to access this page.");
			throw redirect({
				to: "/",
			});
	}
}

export const getAge = (birthdate: string) => {
	return Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000);
};
