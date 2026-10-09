import {
  addDays,
  differenceInCalendarDays,
  format,
  getDay,
  parseISO,
} from "date-fns";
import { LIMITS } from "@/lib/config/limits";

export interface StudyWeekOccurrence {
  week: number;
  classDate: string;
  dueDate: string;
  title: string;
}

const ISO_DATE_FORMAT = "yyyy-MM-dd";
const DAYS_PER_WEEK = 7;

/**
 * Expands a weekly class day and term range into one study task per class week.
 * Each task is due the day before the next class, so it turns overdue only if
 * the week's content was not studied before the following class.
 *
 * @example
 * buildStudyWeekOccurrences(3, "2026-02-02", "2026-02-20"); // Wednesdays
 */
export function buildStudyWeekOccurrences(
  weekday: number,
  termStart: string,
  termEnd: string,
): StudyWeekOccurrence[] {
  const start = parseISO(termStart);
  const end = parseISO(termEnd);
  const offset = (weekday - getDay(start) + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const occurrences: StudyWeekOccurrence[] = [];

  for (
    let classDay = addDays(start, offset);
    classDay <= end;
    classDay = addDays(classDay, DAYS_PER_WEEK)
  ) {
    const week = occurrences.length + 1;
    occurrences.push({
      week,
      classDate: format(classDay, ISO_DATE_FORMAT),
      dueDate: format(addDays(classDay, DAYS_PER_WEEK - 1), ISO_DATE_FORMAT),
      title: buildStudyWeekTitle(week),
    });
  }

  return occurrences;
}

/**
 * Title given to a generated study task. Also used to tell untouched generated
 * tasks apart from ones the user renamed.
 *
 * @example
 * buildStudyWeekTitle(2); // "Study week 2 content"
 */
export function buildStudyWeekTitle(week: number): string {
  return `Study week ${week} content`;
}

/**
 * Cheap guard run before expanding a term into weeks, so a mistyped or hostile
 * range (e.g. year 1 to 9999) is rejected without building every class date.
 * Invalid dates pass here and are rejected later by the zero-week check.
 *
 * @example
 * isStudyTermWithinLimit("2026-02-02", "2026-06-30"); // true
 */
export function isStudyTermWithinLimit(
  termStart: string,
  termEnd: string,
): boolean {
  const days = differenceInCalendarDays(parseISO(termEnd), parseISO(termStart));
  return !(days > LIMITS.studyScheduleMaxWeeks * DAYS_PER_WEEK);
}
