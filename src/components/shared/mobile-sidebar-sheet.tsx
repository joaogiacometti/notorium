"use client";

import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileSidebarSheetProps {
  children: React.ReactNode;
}

/**
 * Mobile entry point for the left menu: a slim toggle bar (shown below `lg`)
 * that opens the sidebar in a left sheet. Closes automatically on navigation.
 */
export function MobileSidebarSheet({
  children,
}: Readonly<MobileSidebarSheetProps>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger — close sheet on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="sticky top-0 z-30 flex items-center border-b border-border/60 bg-background/80 px-3 py-1.5 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="gap-1.5">
            <PanelLeft className="size-4" />
            Menu
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mt-6 min-h-0 flex-1">{children}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
