import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export default function SignupLoading() {
  return (
    <AuthFormSkeleton
      subheadingLines={2}
      rows={[
        [{ label: "w-20" }],
        [{ label: "w-10" }],
        [{ label: "w-16", description: true }, { label: "w-32" }],
      ]}
    />
  );
}
