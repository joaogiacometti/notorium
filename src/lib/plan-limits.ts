export type UserPlan = "free" | "pro" | "unlimited";

interface PlanLimits {
  maxSubjects: number | null;
  maxNotesPerSubject: number | null;
  maxAssessmentsPerSubject: number | null;
  maxFlashcardsPerSubject: number | null;
  flashcardsAllowed: boolean;
  imagesAllowed: boolean;
  maxImageStorageMb: number | null;
}

export const FREE_LIMITS: PlanLimits = {
  maxSubjects: 5,
  maxNotesPerSubject: 5,
  maxAssessmentsPerSubject: 5,
  maxFlashcardsPerSubject: 0,
  flashcardsAllowed: false,
  imagesAllowed: false,
  maxImageStorageMb: 0,
};

export const PRO_LIMITS: PlanLimits = {
  maxSubjects: 20,
  maxNotesPerSubject: 30,
  maxAssessmentsPerSubject: 15,
  maxFlashcardsPerSubject: 500,
  flashcardsAllowed: true,
  imagesAllowed: true,
  maxImageStorageMb: 50,
};

const UNLIMITED_LIMITS: PlanLimits = {
  maxSubjects: null,
  maxNotesPerSubject: null,
  maxAssessmentsPerSubject: null,
  maxFlashcardsPerSubject: null,
  flashcardsAllowed: true,
  imagesAllowed: true,
  maxImageStorageMb: null,
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
