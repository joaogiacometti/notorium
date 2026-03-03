import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

export default function NotFound() {
  const t = useTranslations("NotFoundPage");
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-8xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/" data-testid="not-found-home-link">
            {t("home")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
