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
}

