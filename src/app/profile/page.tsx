import { ProfileForm } from "@/components/profile-form";
import { requireSession } from "@/lib/auth";
import type { UserPlan } from "@/lib/plan-limits";

export default async function ProfilePage() {
  const session = await requireSession();

  return (
    <main>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Manage Profile</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Review your account information and keep your profile up to date.
        </p>
        <ProfileForm
          name={session.user.name}
          email={session.user.email}
          plan={(session.user.plan ?? "free") as UserPlan}
          createdAt={new Date(session.user.createdAt).toISOString()}
          updatedAt={new Date(session.user.updatedAt).toISOString()}
        />
      </div>
    </main>
  );
}
