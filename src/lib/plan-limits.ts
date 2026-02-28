export type UserPlan = "free" | "unlimited";

interface PlanLimits {
  maxSubjects: number | null;
  maxNotesPerSubject: number | null;
  maxAssessmentsPerSubject: number | null;
  imagesAllowed: boolean;
}

const FREE_LIMITS: PlanLimits = {
  maxSubjects: 5,
  maxNotesPerSubject: 5,
  maxAssessmentsPerSubject: 5,
  imagesAllowed: false,
};

const UNLIMITED_LIMITS: PlanLimits = {
  maxSubjects: null,
  maxNotesPerSubject: null,
  maxAssessmentsPerSubject: null,
  imagesAllowed: true,
};

export function getPlanLimits(plan: UserPlan): PlanLimits {
  if (plan === "unlimited") {
    return UNLIMITED_LIMITS;
  }
  return FREE_LIMITS;
}
