// Shared frame of the signed-out pages (login, signup, password reset): the
// form card centered on the full viewport, which has no app chrome here.
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-3 p-6">
      <div className="w-full max-w-sm md:max-w-4xl">{children}</div>
    </div>
  );
}
