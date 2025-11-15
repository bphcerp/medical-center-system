import type { AnyRoute } from "@tanstack/react-router";
import { createContext } from "react";

export type AuthContextData = {
	allowedRoutes: AnyRoute[];
};

export const AuthContext = createContext<AuthContextData>({
	allowedRoutes: [],
});
