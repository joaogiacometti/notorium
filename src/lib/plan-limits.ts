export type UserPlan = "free" | "pro" | "unlimited";

interface PlanLimits {
  maxSubjects: number | null;
  maxNotesPerSubject: number | null;
  maxAssessmentsPerSubject: number | null;
  maxFlashcardsPerSubject: number | null;
  flashcardsAllowed: boolean;
}

export const FREE_LIMITS: PlanLimits = {
  maxSubjects: 5,
  maxNotesPerSubject: 5,
  maxAssessmentsPerSubject: 5,
  maxFlashcardsPerSubject: 0,
  flashcardsAllowed: false,
};

export const PRO_LIMITS: PlanLimits = {
  maxSubjects: 20,
  maxNotesPerSubject: 30,
  maxAssessmentsPerSubject: 15,
  maxFlashcardsPerSubject: 500,
  flashcardsAllowed: true,
};

const UNLIMITED_LIMITS: PlanLimits = {
  maxSubjects: null,
  maxNotesPerSubject: null,
  maxAssessmentsPerSubject: null,
  maxFlashcardsPerSubject: null,
  flashcardsAllowed: true,
};

export function getPlanLimits(plan: UserPlan): PlanLimits {
  if (plan === "unlimited") {
    return UNLIMITED_LIMITS;
  }
  if (plan === "pro") {
    return PRO_LIMITS;
  }
  return FREE_LIMITS;
}
