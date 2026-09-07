import type { Metadata } from "next";
import NotificationsScreen from "@/components/notifications/NotificationsScreen";

export const metadata: Metadata = { title: "通知" };

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
