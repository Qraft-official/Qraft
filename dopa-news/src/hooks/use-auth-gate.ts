"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { useSession } from "@/hooks/use-session";
import { useToast } from "@/hooks/use-toast";

/**
 * Returns a guard that sends signed-out users to the login screen and brings
 * them straight back to where they were.
 */
export function useAuthGate() {
  const { user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  return useCallback(
    (action = "この操作") => {
      if (user) return true;
      toast(`${action}にはログインが必要です`, "info");
      router.push(`/login?next=${encodeURIComponent(pathname ?? "/")}`);
      return false;
    },
    [user, router, pathname, toast],
  );
}
