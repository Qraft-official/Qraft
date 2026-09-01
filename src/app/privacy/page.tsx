import { LegalDocument } from "@/components/LegalDocument";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default function PrivacyPage() {
  const markdown = readFileSync(join(process.cwd(), "src/content/qraft_privacy_policy.md"), "utf8");
  return <LegalDocument title="プライバシーポリシー" markdown={markdown} />;
}
