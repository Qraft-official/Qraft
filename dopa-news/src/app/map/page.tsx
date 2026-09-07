import type { Metadata } from "next";
import MapScreen from "@/components/map/MapScreen";

export const metadata: Metadata = {
  title: "ドパマップ",
  description: "天気・交通・イベントなど、街のいまをリアルタイムで共有する地図。",
};

export default function MapPage() {
  return <MapScreen />;
}
