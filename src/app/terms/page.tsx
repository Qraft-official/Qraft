import { LegalDocument } from "@/components/LegalDocument";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export default function TermsPage() {
  const markdown = readFileSync(join(process.cwd(), "src/content/qraft_terms_of_service.md"), "utf8");
  return <LegalDocument title="利用規約" markdown={markdown} />;
}
