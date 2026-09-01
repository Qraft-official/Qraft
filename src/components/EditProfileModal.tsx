"use client";

import { ProfileEditForm } from "@/components/ProfileEditForm";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function EditProfileModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            onClick={(e) => e.stopPropagation()}
            className="h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-gray-800 bg-black p-4 sm:rounded-3xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">プロフィールを編集</p>
              <button type="button" onClick={onClose} className="text-muted" aria-label="閉じる">
                <X size={18} />
              </button>
            </div>
            <ProfileEditForm onSaved={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
