"use client";

import { BookOpenText } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthFormShellProps extends ComponentProps<"div"> {
  heading: string;
  subheading: string;
  footer: ReactNode;
  children: ReactNode;
}

export function AuthFormShell({
  heading,
  subheading,
  footer,
  children,
  className,
  ...props
}: Readonly<AuthFormShellProps>) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-4 sm:p-6 md:p-8">
            <div className="mb-5 flex flex-col gap-2 text-center md:mb-6">
              <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
              <p className="text-sm text-muted-foreground">{subheading}</p>
            </div>
            {children}
            <p className="mt-5 text-center text-sm leading-relaxed text-muted-foreground [&_a]:ml-1 [&_a]:rounded-sm [&_a]:font-medium [&_a]:text-foreground/90 [&_a]:underline-offset-4 [&_a]:transition-colors [&_a]:hover:text-foreground [&_a]:hover:underline [&_a]:focus-visible:outline-none [&_a]:focus-visible:ring-2 [&_a]:focus-visible:ring-ring [&_a]:focus-visible:ring-offset-2">
              {footer}
            </p>
          </div>
          <div className="relative hidden bg-muted md:block">
            <div className="absolute inset-0 bg-linear-to-br from-primary/10 via-muted/40 to-background" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full border border-primary/20 bg-primary/10 p-5">
                <BookOpenText className="size-10 text-primary" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
