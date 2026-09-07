"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[110] mx-auto w-full max-w-[var(--app-max-width)] pad-safe-top"
        >
          <div className="flex items-center justify-center gap-2 bg-[#ff5c7a] px-4 py-1.5 text-[12px] font-semibold text-[#0b0d12]">
            <WifiOff size={13} />
            オフラインです。表示中の内容は最新ではない可能性があります
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
