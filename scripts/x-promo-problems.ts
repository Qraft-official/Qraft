import type { Subject } from "../src/lib/types";

export type XPromoProblem = {
  seedKey: string;
  title: string;
  subject: Subject;
  field: string;
  level: number;
  mode: "aha";
  problem: string;
  answer: string;
  hint: string;
  solution: string;
  ahaPoint: string;
};

export const X_PROMO_PROBLEMS: XPromoProblem[] = [
  {
    seedKey: "x_promo_202609_01",
    title: "逆にすると27減る数",
    subject: "math",
    field: "整数",
    level: 2,
    mode: "aha",
    problem:
      "2桁の正の整数があります。\n十の位と一の位を入れ替えると、元の数より27小さくなります。\nさらに2つの数字の和は11です。\n元の整数は？",
    answer: "74",
    hint: "十の位をa、一の位をbとしてみよう。",
    solution:
      "元の数は10a+b、逆にすると10b+a。\n(10a+b)-(10b+a)=27より9(a-b)=27なのでa-b=3。\nまたa+b=11。\n2式を解くとa=7、b=4。\nしたがって74。",
    ahaPoint: "「2桁の数」を10a+bに置き換えるだけで一気に解ける。",
  },
  {
    seedKey: "x_promo_202609_02",
    title: "絶対に同じ余りになる？",
    subject: "math",
    field: "整数",
    level: 3,
    mode: "aha",
    problem:
      "1から100までの整数から、好きな51個を選びます。\n選び方に関係なく、\n差が50になる2数は必ず存在するでしょうか？",
    answer: "必ず存在する。",
    hint: "1と51、2と52、…をペアにして考える。",
    solution:
      "(1,51),(2,52),…,(50,100)の50組に分けられる。\n51個選ぶと、鳩の巣原理により少なくとも1組から両方を選ぶことになる。\nその2数の差は50。",
    ahaPoint: "100個を見るのではなく「差50の50ペア」に分ける。",
  },
  {
    seedKey: "x_promo_202609_03",
    title: "最後の1桁だけ求めよ",
    subject: "math",
    field: "整数",
    level: 3,
    mode: "aha",
    problem: "7^2026 の一の位は？",
    answer: "9",
    hint: "7の累乗の一の位を最初の数個だけ並べてみよう。",
    solution:
      "7,9,3,1と4周期で繰り返す。\n2026÷4の余りは2。\nしたがって7^2026の一の位は7^2と同じ9。",
    ahaPoint: "巨大な累乗を計算せず周期だけを見る。",
  },
  {
    seedKey: "x_promo_202609_04",
    title: "平均速度の罠",
    subject: "physics",
    field: "力学",
    level: 3,
    mode: "aha",
    problem:
      "同じ距離を、\n行きは時速30km、\n帰りは時速60km\nで移動しました。\n\n往復全体の平均速度は45km/hでしょうか？",
    answer: "40km/h",
    hint: "片道の距離を60kmとしてみよう。",
    solution:
      "片道60kmとすると、\n行きは2時間、帰りは1時間。\n総距離120km、総時間3時間なので、\n平均速度は120÷3=40km/h。",
    ahaPoint: "速度の単純平均ではなく「総距離÷総時間」。",
  },
  {
    seedKey: "x_promo_202609_05",
    title: "3枚のカード",
    subject: "math",
    field: "確率",
    level: 4,
    mode: "aha",
    problem:
      "カードが3枚あります。\n\n両面が白のカード\n両面が黒のカード\n片面白・片面黒のカード\n\nを1枚ランダムに選び、さらに置く向きもランダムです。\n\n見えている面が白でした。\n裏面も白である確率は？",
    answer: "2/3",
    hint: "「白が見える場合」をカードではなく面で数える。",
    solution:
      "白い面は全部で3面。\n白白カードには白面が2つ、\n白黒カードには白面が1つある。\n\n白が見えたという条件下では、\n3つの白面が等確率。\n\nそのうち白白カード由来は2面なので、\n裏も白である確率は2/3。",
    ahaPoint: "カードを数えるのではなく「観測可能な白い面」を数える。",
  },
  {
    seedKey: "x_promo_202609_06",
    title: "0.999…は1より小さい？",
    subject: "math",
    field: "数",
    level: 3,
    mode: "aha",
    problem: "x = 0.999999… とします。\n\nxは1よりほんの少しだけ小さい数でしょうか？",
    answer: "x = 1",
    hint: "10xを作ってxを引いてみよう。",
    solution:
      "x=0.999…\n10x=9.999…\n\n両辺を引くと\n9x=9。\n\nしたがってx=1。\n\nよって0.999…=1。",
    ahaPoint: "無限小数を直接考えず、10倍して引く。",
  },
  {
    seedKey: "x_promo_202609_07",
    title: "正方形はいくつ？",
    subject: "math",
    field: "組合せ",
    level: 3,
    mode: "aha",
    problem: "3×3のマス目があります。\n\n中に含まれる正方形は全部で何個？",
    answer: "14",
    hint: "1×1だけではない。",
    solution: "1×1の正方形は9個。\n2×2は4個。\n3×3は1個。\n\n合計9+4+1=14個。",
    ahaPoint: "サイズ別に分けて数える。",
  },
  {
    seedKey: "x_promo_202609_08",
    title: "半分になるまで",
    subject: "math",
    field: "指数",
    level: 3,
    mode: "aha",
    problem:
      "ある量が毎日半分になります。\n\n1日目に全体の半分、\n2日目にさらに半分、\n…\nと減っていきます。\n\n10日後に元の量の何倍になっていますか？",
    answer: "1/1024",
    hint: "1/2を10回掛ける。",
    solution: "毎日1/2になるので、\n10日後は\n\n(1/2)^10 = 1/1024。",
    ahaPoint: "「半分になる」を指数として見る。",
  },
];
