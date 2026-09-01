"use client";

import { ReferralInviteCard, WelcomeMissionCard } from "@/components/ReferralCards";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function WelcomeMissionPage() {
  const router = useRouter();
  return (
    <div className="px-4 py-6">
      <button type="button" onClick={() => router.back()} className="mb-4 text-muted" aria-label="戻る">
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-2xl font-black">Welcome Mission</h1>
      <p className="mt-2 text-sm text-muted">
        紹介コード適用から4日以内（96時間）に3つすべて達成すると、紹介者の翌月プレミアムが半額になります。
      </p>
      <div className="mt-4 space-y-3">
        <WelcomeMissionCard compact />
        <ReferralInviteCard />
      </div>
    </div>
  );
}
