"use client";

import { ChevronDownIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function DatePicker({
	disabled,
	value,
	onChange,
}: {
	disabled?: boolean;
	value?: Date;
	onChange?: (date: Date | undefined) => void;
}) {
	const [open, setOpen] = React.useState(false);

	return (
		<div className="flex flex-col gap-3">
			<Label htmlFor="date">Date of birth</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild disabled={disabled}>
					<Button
						variant="outline"
						id="date"
						className="justify-between font-normal"
						disabled={disabled}
					>
						{value
							? `${value.getFullYear()}-${(value.getMonth() + 1).toString().padStart(2, "0")}-${value.getDate().toString().padStart(2, "0")}`
							: "Select date"}
						<ChevronDownIcon />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto overflow-hidden p-0" align="start">
					<Calendar
						mode="single"
						selected={value}
						defaultMonth={value}
						captionLayout="dropdown"
						onSelect={(date) => {
							setOpen(false);
							onChange?.(date);
						}}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
