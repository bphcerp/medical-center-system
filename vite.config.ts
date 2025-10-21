import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	server: {
		port: 3000,
	},
	plugins: [
		// this is the plugin that enables path aliases
		tsconfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tanstackStart({
			spa: {
				enabled: true,
			},
		}),
		react(),
		tailwindcss(),
	],
});

export default config;
