import type { Metadata } from "next";
import DocPage, { DocList, DocSection } from "@/components/legal/DocPage";
import { SOURCE_TRUST } from "@/lib/categories";

export const metadata: Metadata = { title: "ニュースとサンプルデータについて" };

const TRUST_ORDER = ["official", "major_media", "multi_report", "unconfirmed"] as const;

const TONE_COLOR: Record<string, string> = {
  good: "#4ef5a3",
  ok: "#35dcff",
  warn: "#ffc44d",
};

export default function AboutPage() {
  return (
    <DocPage
      title="このアプリについて"
      updated="2026年9月7日"
      lead="ドパニュースがどうやってニュースを作っているか、情報源をどう扱っているか、そして開発用サンプルデータについて説明します。"
    >
      <DocSection heading="開発用サンプルデータについて">
        <p>
          現在このアプリに表示されているニュースとドパマップの投稿には、動作確認のための<strong className="font-bold text-[#ffc44d]">架空のサンプルデータ</strong>が含まれています。実在の出来事・団体・人物とは関係ありません。サンプルには「サンプル」ラベルが付きます。
        </p>
      </DocSection>

      <DocSection heading="ニュースの作り方">
        <p>
          ドパニュースは他社のニュース記事本文を転載しません。表示しているのは次の要素だけです。
        </p>
        <DocList
          items={[
            "独自に付けたタイトルと短い要約",
            "「何が起きた？」「なんで話題？」「3秒で理解」の独自解説",
            "情報源の名前と、元記事へのリンク",
          ]}
        />
        <p>
          解説文はAIが情報源をもとに作成し、公開前に人が確認しています。AIには「情報源にない事実を足さない」「不明なことは不明と書く」「要約と意見を混ぜない」というルールを適用しています。それでも誤りが残る可能性はあるため、重要な判断をする前に必ず情報源をご確認ください。
        </p>
      </DocSection>

      <DocSection heading="情報源の種別">
        <p>ニュースごとに、情報源の性質を次の4種類で表示しています。</p>
        <ul className="space-y-2 pt-1">
          {TRUST_ORDER.map((key) => {
            const trust = SOURCE_TRUST[key];
            return (
              <li
                key={key}
                className="rounded-2xl border border-line bg-ink-700 px-3.5 py-2.5"
              >
                <span
                  className="text-[12.5px] font-bold"
                  style={{ color: TONE_COLOR[trust.tone] }}
                >
                  {trust.mark} {trust.label}
                </span>
                <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">{trust.help}</p>
              </li>
            );
          })}
        </ul>
        <p className="pt-1">
          これは情報源の種類を示すものであり、アプリが内容の真偽を保証しているわけではありません。
        </p>
      </DocSection>

      <DocSection heading="画像について">
        <p>
          記事画像は、利用が許諾されているOGP画像・公式素材・ライセンス済み素材に限定しています。権利者の許諾がない記事画像は使用しません。
        </p>
      </DocSection>

      <DocSection heading="ドパマップの投稿について">
        <p>
          ドパマップに表示される投稿はユーザーによる目撃情報であり、公的機関の発表ではありません。誤情報対策として、投稿時刻の表示、時間経過による自動非表示、同一エリアの報告件数の表示、「役に立った」、通報、連投制限を実装しています。
        </p>
        <p>
          災害・事故・警報など生命に関わる情報は、必ず自治体・気象庁・報道機関などの公式情報を確認してください。
        </p>
      </DocSection>

      <DocSection heading="未来予測クイズについて">
        <p>
          「このあとどうなる？」は、答えが確定していない出来事についてユーザーが予想する機能です。投票後に表示されるのは、あくまで<strong className="font-bold text-fg">みんなの予想の分布</strong>です。結果が確定したニュースだけ、後日答え合わせを表示します。
        </p>
      </DocSection>
    </DocPage>
  );
}
