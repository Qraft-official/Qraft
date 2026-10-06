import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import styles from "./BlogMarkdown.module.css";

/** Server-rendered Markdown. Raw HTML/MDX is not executed; links use react-markdown's safe URL transform. */
export function BlogMarkdown({ content }: { content: string }) {
  return (
    <div className={styles.prose}>
      <Markdown skipHtml remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, strict: "ignore" }]]}>
        {content}
      </Markdown>
    </div>
  );
}
