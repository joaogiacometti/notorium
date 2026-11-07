import { AuthFormSkeleton } from "@/components/auth/auth-form-skeleton";

export default function LoginLoading() {
  return (
    <AuthFormSkeleton
      rows={[[{ label: "w-10" }], [{ label: "w-16", trailingLink: true }]]}
    />
  );
}
