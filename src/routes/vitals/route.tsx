import {
	createFileRoute,
	Link,
	Outlet,
	useParams,
	useRouter,
} from "@tanstack/react-router";
import { Activity, ClipboardPlus, Plus } from "lucide-react";
import { useState } from "react";
import { PatientTypeBadge } from "@/components/patient-type-badge";
import { RegistrationForm } from "@/components/registration-card";
import { TokenButton, TokenButtonTitle } from "@/components/token-button";
import TopBar from "@/components/topbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

import { cn, handleErrors, titleCase } from "@/lib/utils";
import { client } from "../api/$";

export const Route = createFileRoute("/vitals")({
	loader: async () => {
		const unprocessedRes = await client.api.vitals.unprocessed.$get();
		const unprocessed = await handleErrors(unprocessedRes);

		return { unprocessed: unprocessed || [] };
	},
	component: Vitals,
	staticData: {
		requiredPermissions: ["vitals"],
		icon: Activity,
		name: "Vitals Entry",
	},
});

function Vitals() {
	const { unprocessed } = Route.useLoaderData();
	const selectedToken = useParams({
		from: "/vitals/$token",
		shouldThrow: false,
		select: (p) => Number(p.token),
	});

	return (
		<div className="flex flex-col items-stretch h-dvh">
			<TopBar title="Patient Queue" />
			<div className="flex items-stretch divide-x divide-border grow min-h-0 h-after-topbar">
				<div
					className={cn(
						"relative flex flex-col flex-2 px-4 pt-4 overflow-y-scroll bg-background bottom-0 min-h-0",
						selectedToken !== undefined && "hidden lg:flex",
					)}
				>
					<div className="grow flex flex-col gap-4">
						{unprocessed.length === 0 && (
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<ClipboardPlus />
									</EmptyMedia>
									<EmptyTitle>No unprocessed patients</EmptyTitle>
									<EmptyDescription>
										When new patients arrive, they will appear here.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						)}
						{unprocessed.map((patient) => {
							const isSelected = patient.token === selectedToken;

							const sex = titleCase(patient.patients.sex);
							return (
								<Link
									to="/vitals/$token"
									replace
									params={{ token: patient.token.toString() }}
									key={patient.token}
								>
									<TokenButton
										variant="ghost"
										token={patient.token.toString()}
										selected={isSelected}
									>
										<div className="flex flex-col items-start">
											<TokenButtonTitle>
												{patient.patients.name}
											</TokenButtonTitle>
											<div className="flex justify-between w-full items-end">
												<span className="text-muted-foreground font-medium text-left text-sm">
													{sex}, {patient.patients.age} y.o.
												</span>
												<PatientTypeBadge type={patient.type} />
											</div>
										</div>
									</TokenButton>
								</Link>
							);
						})}
					</div>
					<div className="sticky flex flex-col bottom-0 bg-linear-to-t from-background to-transparent from-70% via-85% to-100% pb-4 pt-10">
						<NewPatientDialog />
					</div>
				</div>
				<div
					className={cn(
						"flex-col flex-5 p-4 lg:p-12 w-full",
						selectedToken === undefined && "hidden lg:block",
					)}
				>
					<Outlet />
				</div>
			</div>
		</div>
	);
}

function NewPatientDialog() {
	const router = useRouter();
	const [token, setTokenInternal] = useState<number | null>(null);

	const handleToken = (newToken: number) => {
		router.invalidate();
		setTokenInternal(newToken);
	};

	return (
		<Dialog onOpenChange={(open) => !open && setTokenInternal(null)}>
			<DialogTrigger asChild>
				<Button variant="secondary" size="lg">
					<Plus /> New Patient
				</Button>
			</DialogTrigger>

			<DialogContent>
				{token === null ? (
					<RegistrationForm
						setToken={handleToken}
						isPatientRegistering={false}
					/>
				) : (
					<div className="flex flex-col items-center gap-4">
						<span>Patient's token number</span>
						<span className="text-7xl">{token}</span>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
