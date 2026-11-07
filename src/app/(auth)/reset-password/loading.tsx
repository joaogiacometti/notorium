import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export default function ResetPasswordLoading() {
  return (
    <AuthFormSkeleton
      subheadingLines={2}
      rows={[
        [{ label: "w-28", description: true }],
        [{ label: "w-40", description: true }],
      ]}
    />
  );
}
