import { z } from "zod";

export const timeZoneOptions = ["UTC", ...Intl.supportedValuesOf("timeZone")];

export const timeZoneSchema = z.enum(timeZoneOptions);
