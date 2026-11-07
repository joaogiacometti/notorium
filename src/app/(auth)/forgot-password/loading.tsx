import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export default function ForgotPasswordLoading() {
  return <AuthFormSkeleton subheadingLines={2} rows={[[{ label: "w-10" }]]} />;
}
