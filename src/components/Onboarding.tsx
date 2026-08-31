"use client";

import { AgePicker, SubjectLevelPickers } from "@/components/LearningSettings";
import { GuardianConsentCheckbox } from "@/components/GuardianConsentCheckbox";
import { ageForSave, needsGuardianConsent } from "@/lib/guardian-consent";
import { useApp } from "@/lib/store";
import type { Tiers } from "@/lib/types";
import { motion } from "framer-motion";
import { useState } from "react";

export function Onboarding() {
  const { completeOnboarding } = useApp();
  const [age, setAge] = useState<number | null>(null);
  const [tiers, setTiers] = useState<Tiers>({ math: 1, physics: 1, chemistry: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black px-5 py-10">
      <div className="mx-auto max-w-md">
        <p className="text-sm font-bold tracking-[0.2em] text-aha">QRAFT</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">
          はじめに、年齢と
          <br />
          3科目の現在地を選ぶ。
        </h1>
        <p className="mt-3 text-sm text-muted">
          この画面は初回登録時のみです。レベルはあとからプロフィールで変えられます。
        </p>

        <div className="mt-8 space-y-6">
          <AgePicker age={age} onChange={setAge} />
          {needsGuardianConsent(age) && (
            <GuardianConsentCheckbox
              id="onboarding-guardian-consent"
              checked={consent}
              onChange={setConsent}
            />
          )}
          <SubjectLevelPickers tiers={tiers} onChange={setTiers} />
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={busy || (needsGuardianConsent(age) && !consent)}
          onClick={() => {
            if (needsGuardianConsent(age) && !consent) {
              setError("15歳未満の方は、保護者の同意確認にチェックしてください");
              return;
            }
            const nextAge = ageForSave(age);
            setBusy(true);
            setError("");
            void completeOnboarding({ age: nextAge, tiers }).then((res) => {
              setBusy(false);
              if (res?.error) setError(res.error);
            });
          }}
          className="glow-lime mt-8 w-full rounded-full bg-aha py-4 text-base font-black text-black disabled:opacity-40"
        >
          {busy ? "保存中…" : "Qraft を始める"}
        </motion.button>
      </div>
    </div>
  );
}
