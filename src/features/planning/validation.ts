import { z } from "zod";

export const calendarEventsRangeSchema = z
  .object({
    rangeStart: z.iso.date(),
    rangeEnd: z.iso.date(),
  })
  .refine(({ rangeStart, rangeEnd }) => rangeStart <= rangeEnd, {
    message: "rangeStart must be on or before rangeEnd",
  });
