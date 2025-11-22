/** biome-ignore-all lint/suspicious/noExplicitAny: Legit cannot find any other way to make this work */
/**
 * StrictHono - Type-safe Hono wrapper with enforced path validation
 *
 * IMPORTANT: All endpoint paths MUST start with "/" for proper RPC type inference.
 * Paths without leading slashes will result in a clear type error at the API definition.
 *
 * Example:
 *   .get("/users", ...)     // ✅ Correct
 *   .post("/users", ...)    // ✅ Correct
 *   .get("users", ...)      // ❌ Type error: "ERROR: Path must start with / (got \"users\")"
 */
import { zValidator } from "@hono/zod-validator";
import { type Context, Hono, type Next, type ValidationTargets } from "hono";
import type {
	BlankInput,
	BlankSchema,
	Env,
	HTTPResponseError,
	Input,
	Schema,
	ToSchema,
} from "hono/types";
import type { StatusCode } from "hono/utils/http-status";
import { z } from "zod";
import type { Permission } from "@/lib/types/permissions";

export type JWTPayload = {
	passwordHash: null;
	role: {
		id: number;
		name: string;
		allowed: Permission[];
	};
	id: number;
	username: string;
	email: string;
	name: string;
	phone: string;
	fingerprintHash: string;
};

export type Variables = {
	jwtPayload: JWTPayload;
};

// Typed Response for Hono Client inference
export type TypedResponse<
	T = unknown,
	S extends StatusCode = StatusCode,
	F extends "json" | "text" | "arrayBuffer" | "blob" = "json",
> = Response & {
	_data: T;
	_status: S;
	_format: F;
};

// Response types
export type SuccessResponse<T> = { success: true; data: T };
export type ErrorResponse<E = unknown> = {
	success: false;
	error: { message: string; details?: E };
};

export type ApiResponse<T = unknown, E = unknown> =
	| SuccessResponse<T>
	| ErrorResponse<E>;

// Helper type to serialize data as it would be over JSON
type Serialize<T> = T extends Date
	? string
	: T extends Array<infer U>
		? Array<Serialize<U>>
		: T extends object
			? { [K in keyof T]: Serialize<T[K]> }
			: T;

// Helper type to convert param types to strings (as they are in URLs)
type StringifyParams<I extends Input> = I extends {
	in: infer InTypes;
	out: infer OutTypes;
}
	? InTypes extends { param: infer P }
		? {
				in: Omit<InTypes, "param"> & { param: { [K in keyof P]: string } };
				out: OutTypes;
			}
		: I
	: I;

// Strict context - enforces complete response structures
export type StrictContext<
	E extends Env = { Variables: Variables },
	P extends string = string,
	I extends Input = BlankInput,
> = Omit<Context<E, P, I>, "json"> & {
	json<T, S extends StatusCode = 200>(
		data: { success: true; data: T },
		status?: S,
	): TypedResponse<{ success: true; data: Serialize<T> }, S>;
	json<Err, S extends StatusCode = StatusCode>(
		data: { success: false; error: { message: string; details?: Err } },
		status?: S,
	): TypedResponse<
		{ success: false; error: { message: string; details?: Err } },
		S
	>;
};

// Strict handler
export type StrictHandler<
	E extends Env = { Variables: Variables },
	P extends string = string,
	I extends Input = BlankInput,
	R =
		| TypedResponse<unknown>
		| Response
		| undefined
		| Promise<TypedResponse<unknown> | Response | undefined>,
> = (c: StrictContext<E, P, I>, next: Next) => R;

// Middleware overload
type Use<E extends Env, S extends Schema, B extends string> = {
	<P extends string, I extends Input = BlankInput>(
		path: P,
		...middleware: StrictHandler<E, P, I>[]
	): StrictHono<E, S, B>;
	<P extends string, I extends Input = BlankInput>(
		...middleware: StrictHandler<E, P, I>[]
	): StrictHono<E, S, B>;
};

// Helper to merge schema
type MergeSchema<
	S extends Schema,
	M extends string,
	P extends string,
	I extends Input,
	O,
> = S & ToSchema<M, P, I, O>;

// Helper to extract data type from response - keep structure for status discrimination
type ExtractData<R> = Awaited<R>;

// Helper to merge paths
type MergePath<B extends string, P extends string> = B extends "/"
	? P
	: P extends "/"
		? B
		: `${B}${P}`;

// Helper to merge schema paths
type MergeSchemaPath<SubSchema extends Schema, SubPath extends string> = {
	[K in keyof SubSchema as K extends string
		? string extends K
			? never
			: SubPath extends "/"
				? K
				: `${SubPath}${K extends "/" ? "" : K}`
		: never]: SubSchema[K];
};

// Helper to validate path starts with /
type ValidatePath<P extends string> = P extends `/${string}`
	? P
	: `ERROR: Path must start with / (got "${P}")`;

// Route method with middleware overloads
type Route<
	E extends Env,
	S extends Schema,
	B extends string,
	M extends string,
> = {
	<
		P extends string,
		I extends Input = BlankInput,
		R extends
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined> =
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined>,
	>(
		path: ValidatePath<P>,
		handler: StrictHandler<E, P, I, R>,
	): StrictHono<
		E,
		MergeSchema<S, M, MergePath<B, P>, StringifyParams<I>, ExtractData<R>>,
		B
	>;
	<
		P extends string,
		I1 extends Input,
		I2 extends Input = BlankInput,
		R extends
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined> =
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined>,
	>(
		path: ValidatePath<P>,
		m1: StrictHandler<E, any, I1>,
		handler: StrictHandler<E, P, I1 & I2, R>,
	): StrictHono<
		E,
		MergeSchema<
			S,
			M,
			MergePath<B, P>,
			StringifyParams<I1 & I2>,
			ExtractData<R>
		>,
		B
	>;
	<
		P extends string,
		I1 extends Input,
		I2 extends Input,
		I3 extends Input = BlankInput,
		R extends
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined> =
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined>,
	>(
		path: ValidatePath<P>,
		m1: StrictHandler<E, any, I1>,
		m2: StrictHandler<E, any, I2>,
		handler: StrictHandler<E, P, I1 & I2 & I3, R>,
	): StrictHono<
		E,
		MergeSchema<
			S,
			M,
			MergePath<B, P>,
			StringifyParams<I1 & I2 & I3>,
			ExtractData<R>
		>,
		B
	>;
	<
		P extends string,
		I1 extends Input,
		I2 extends Input,
		I3 extends Input,
		I4 extends Input = BlankInput,
		R extends
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined> =
			| TypedResponse<unknown>
			| Response
			| undefined
			| Promise<TypedResponse<unknown> | Response | undefined>,
	>(
		path: ValidatePath<P>,
		m1: StrictHandler<E, any, I1>,
		m2: StrictHandler<E, any, I2>,
		m3: StrictHandler<E, any, I3>,
		handler: StrictHandler<E, P, I1 & I2 & I3 & I4, R>,
	): StrictHono<
		E,
		MergeSchema<
			S,
			M,
			MergePath<B, P>,
			StringifyParams<I1 & I2 & I3 & I4>,
			ExtractData<R>
		>,
		B
	>;
};

// Main interface
export interface StrictHono<
	E extends Env = { Variables: Variables },
	S extends Schema = BlankSchema,
	B extends string = "/",
> {
	_schema: S;
	_basePath: B;
	use: Use<E, S, B>;
	basePath<NewPath extends string>(
		path: NewPath,
	): StrictHono<E, S, MergePath<B, NewPath>>;
	fetch: Hono<E, S, B>["fetch"];
	onError(
		handler: (
			err: Error | HTTPResponseError,
			c: StrictContext,
		) => Response | Promise<Response>,
	): StrictHono;
	route<
		SubPath extends string,
		SubEnv extends Env,
		SubSchema extends Schema,
		SubBasePath extends string,
	>(
		path: SubPath,
		app: StrictHono<SubEnv, SubSchema, SubBasePath>,
	): StrictHono<E, S & MergeSchemaPath<SubSchema, MergePath<B, SubPath>>, B>;
	get: Route<E, S, B, "get">;
	post: Route<E, S, B, "post">;
	put: Route<E, S, B, "put">;
	patch: Route<E, S, B, "patch">;
	delete: Route<E, S, B, "delete">;
}

export const createStrictHono = <E extends Env = { Variables: Variables }>() =>
	(new Hono<E>() as unknown as StrictHono<E>).onError((err, c) => {
		console.error("StrictHono Error: ", err);
		return c.json(
			{
				success: false,
				error: { message: "Internal Server Error", details: err.message },
			},
			500,
		);
	});

export const strictValidator = <
	T extends z.ZodSchema,
	Target extends keyof ValidationTargets,
>(
	target: Target,
	schema: T,
) =>
	zValidator(target, schema, (result, c) => {
		if (!result.success) {
			return (c as unknown as StrictContext).json(
				{
					success: false,
					error: {
						message: z.prettifyError(result.error),
						details: z.treeifyError(result.error),
					},
				},
				400,
			);
		}
	}) as unknown as StrictHandler<
		{ Variables: Variables },
		string,
		{ in: { [K in Target]: z.infer<T> }; out: { [K in Target]: z.infer<T> } }
	>;

export const strictJwt = (options: {
	cookie?: string;
	secret: string;
	alg?:
		| "HS256"
		| "HS384"
		| "HS512"
		| "RS256"
		| "RS384"
		| "RS512"
		| "PS256"
		| "PS384"
		| "PS512"
		| "ES256"
		| "ES384"
		| "ES512"
		| "EdDSA";
}) =>
	(async (c, next) => {
		const { verify } = await import("hono/jwt");
		const { getCookie } = await import("hono/cookie");

		let token: string | undefined;

		if (options.cookie) {
			token = getCookie(c as unknown as Context, options.cookie);
		}

		if (!token) {
			const authHeader = c.req.header("Authorization");
			if (authHeader?.startsWith("Bearer ")) {
				token = authHeader.substring(7);
			}
		}

		if (!token) {
			return c.json(
				{
					success: false,
					error: { message: "Unauthorized", details: "No token provided" },
				},
				401,
			);
		}

		try {
			const payload = await verify(token, options.secret, options.alg);
			c.set("jwtPayload", payload);
			await next();
		} catch (e) {
			return c.json(
				{
					success: false,
					error: {
						message: "Unauthorized",
						details: e instanceof Error ? e.message : "Invalid token",
					},
				},
				401,
			);
		}
	}) as StrictHandler;
