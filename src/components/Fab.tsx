"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      className="glow-lime fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-aha text-black"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
      aria-label="新規投稿"
    >
      <Plus size={28} strokeWidth={2.6} />
    </motion.button>
  );
}
