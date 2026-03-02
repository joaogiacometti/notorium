import { UserCircle } from "lucide-react";
import { ProfileForm } from "@/components/profile-form";
import { requireSession } from "@/lib/auth";
import type { UserPlan } from "@/lib/plan-limits";

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex min-w-0 items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserCircle className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className="wrap-break-word text-2xl font-bold tracking-tight">
              Manage Profile
            </h1>
            <p className="mt-1.5 wrap-break-word text-sm text-muted-foreground">
              Review your account information and keep your profile up to date.
            </p>
          </div>
        </div>
        <div className="space-y-6">
          <ProfileForm
            name={session.user.name}
            email={session.user.email}
            plan={(session.user.plan ?? "free") as UserPlan}
            createdAt={new Date(session.user.createdAt).toISOString()}
            updatedAt={new Date(session.user.updatedAt).toISOString()}
          />
        </div>
      </div>
    </main>
  );
}
