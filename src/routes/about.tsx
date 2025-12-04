import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import contributors from "@/lib/contributors.json";

export const Route = createFileRoute("/about")({
	component: About,
});

function About() {
	const router = useRouter();

	return (
		<div className="w-full flex flex-col items-center pt-12 px-12">
			<Button
				variant="ghost"
				onClick={() => router.history.back()}
				size="sm"
				className="fixed top-8 left-12 flex items-center gap-2"
			>
				<ArrowLeft className="text-muted-foreground" /> Back
			</Button>
			<div className="w-full items-center flex flex-col gap-4 pb-8">
				<span className="text-3xl font-semibold">Medical Center System</span>
				<span>
					An initiative by the Medical Center and Community Welfare Group, BITS
					Pilani Hyderabad Campus
				</span>
				<div className="flex flex-col justify-center gap-2">
					<span className="font-medium text-lg text-center">
						Conceptualized and Designed by
					</span>
					<div className="flex items-center gap-2 justify-center">
						{contributors.professors.map((prof) => (
							<Card
								key={prof.name}
								className="flex w-96 flex-col items-center justify-center py-8"
							>
								<CardContent className="flex flex-col items-center justify-center p-0">
									<div className="mb-4 h-28 w-28 rounded-full overflow-hidden">
										<img
											src={prof.imageUrl}
											alt={prof.name}
											className="h-28 w-28 rounded-full object-cover object-center"
										/>
									</div>
									<div className="text-center text-lg font-medium text-foreground">
										{prof.name}
									</div>
									<div className="text-center text-sm text-muted-foreground">
										{prof.department}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</div>
			<div className="w-full pb-24">
				<h1 className="text-xl font-medium mb-4">Developers</h1>
				<div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
					{contributors.students.map((person) => (
						<a
							key={person.id}
							href={`https://github.com/${person.githubUsername}`}
							target="_blank"
							rel="noopener noreferrer"
							className="rounded-xl transition-shadow hover:shadow-lg"
						>
							<Card className="flex h-full flex-col items-center justify-center py-8">
								<CardContent className="flex flex-col items-center justify-center p-0">
									<div className="mb-4 h-28 w-28 rounded-full overflow-hidden">
										<img
											src={person.imageUrl}
											alt={person.name}
											className="h-28 w-28 rounded-full object-cover object-center"
										/>
									</div>
									<div className="text-center text-lg font-medium text-foreground">
										{person.name}
									</div>
									<div className="text-center text-sm text-muted-foreground">
										{person.id}
									</div>
								</CardContent>
							</Card>
						</a>
					))}
				</div>
			</div>
		</div>
	);
}
