import type { Metadata } from "next";
import SettingsScreen from "@/components/profile/SettingsScreen";

export const metadata: Metadata = { title: "設定" };

export default function SettingsPage() {
  return <SettingsScreen />;
}
