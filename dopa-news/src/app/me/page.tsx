import type { Metadata } from "next";
import ProfileScreen from "@/components/profile/ProfileScreen";

export const metadata: Metadata = {
  title: "マイページ",
  description: "プロフィール、投稿・投票の記録、通知や位置情報の設定。",
};

export default function MePage() {
  return <ProfileScreen />;
}
