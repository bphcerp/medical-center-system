import { pgEnum } from "drizzle-orm/pg-core";
import { daysOfWeek } from "@/lib/types/day";

export const dayOfWeekEnum = pgEnum("day_of_week", daysOfWeek);
