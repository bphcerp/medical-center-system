import { CircleQuestionMark } from "lucide-react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./ui/empty";

type NotFoundProps = {
	title: string;
	subtitle?: string;
};

export function NotFound({ title, subtitle }: NotFoundProps) {
	return (
		<Empty className="h-full">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<CircleQuestionMark />
				</EmptyMedia>
				<EmptyTitle>{title}</EmptyTitle>
				<EmptyDescription>{subtitle}</EmptyDescription>
			</EmptyHeader>
		</Empty>
	);
}
