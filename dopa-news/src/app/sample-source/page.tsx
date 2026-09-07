import type { Metadata } from "next";
import Link from "next/link";
import DocPage, { DocList, DocSection } from "@/components/legal/DocPage";

export const metadata: Metadata = {
  title: "サンプル記事の情報源について",
  description: "開発用サンプルニュースには外部の情報源記事がないことを説明するページ。",
};

export default function SampleSourcePage() {
  return (
    <DocPage
      title="この記事の情報源"
      updated="2026年9月7日"
      backHref="/"
      lead="このニュースは開発・デモ用に作られた架空の記事です。そのため、リンク先となる外部の情報源記事は存在しません。"
    >
      <DocSection heading="なぜ外部リンクがないのか">
        <p>
          ドパニュースは、実在するニュースを扱う際には必ず発表元や報道機関の記事へリンクします。一方、開発環境やデモで表示しているサンプルニュースは、実在の出来事・企業・人物とは関係のない架空の内容です。
        </p>
        <p>
          架空の記事に実在メディアのURLを紐づけると、あたかもその媒体が報じたかのような誤解を生むため、サンプル記事の情報源リンクはこの説明ページに向けています。
        </p>
      </DocSection>

      <DocSection heading="サンプル記事の見分け方">
        <DocList
          items={[
            "記事の冒頭に「開発用サンプル」の注意書きが表示されます。",
            "情報源の名称に「サンプル」が含まれています。",
            "「情報源を見る」を押すと、外部サイトではなくこのページが開きます。",
          ]}
        />
      </DocSection>

      <DocSection heading="実際のニュースを扱うときの方針">
        <DocList
          items={[
            "他社記事の本文を転載せず、独自の要約と解説のみを掲載します。",
            "発表元・報道機関名と、元記事へのリンクを必ず表示します。",
            "AIが生成した要約・解説と、情報源の記事を明確に区別して表示します。",
            "画像は公式素材やライセンスを確認できるものに限定します。",
          ]}
        />
      </DocSection>

      <Link
        href="/about"
        className="flex items-center justify-center rounded-2xl border border-line-strong px-4 py-3 text-[13.5px] font-bold text-fg active:bg-white/10"
      >
        ニュースの作り方について詳しく見る
      </Link>
    </DocPage>
  );
}
