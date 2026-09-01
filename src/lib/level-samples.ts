import type { Subject, Tier } from "./types";

export type LevelSample = {
  band: "基礎" | "応用" | "発展";
  bandHint: string;
  title: string;
  problem: string;
  hint: string;
};

function bandOf(tier: Tier): Pick<LevelSample, "band" | "bandHint"> {
  if (tier <= 2) {
    return { band: "基礎", bandHint: "基本的な公式を適用して解く基本問題" };
  }
  if (tier === 3) {
    return { band: "応用", bandHint: "複数のステップや概念を組み合わせる応用問題" };
  }
  return { band: "発展", bandHint: "入試レベルの複合問題や思考力を問う発展問題" };
}

const MATH: Record<Tier, Omit<LevelSample, "band" | "bandHint">> = {
  1: {
    title: "一次方程式",
    problem: "次の方程式を解け。\n\n$$3x + 5 = 14$$",
    hint: "定数項を移項してから、両辺を係数で割ります。",
  },
  2: {
    title: "二次方程式",
    problem: "次の方程式を解け。\n\n$$x^2 - 5x + 6 = 0$$",
    hint: "因数分解 $$(x-2)(x-3)=0$$ を試してみましょう。",
  },
  3: {
    title: "三角比の合成",
    problem:
      "$$\\sin\\theta + \\sqrt{3}\\cos\\theta$$ の最大値を求めよ。また、そのときの $$\\theta$$（$$0\\le\\theta<2\\pi$$）を一つ答えよ。",
    hint: "$$R\\sin(\\theta+\\alpha)$$ の形に合成します。",
  },
  4: {
    title: "微分と接線",
    problem:
      "曲線 $$y=x^3-3x$$ 上の点 $$x=2$$ における接線の方程式を求めよ。さらに、この接線と曲線が再び交わる点の $$x$$ 座標を求めよ。",
    hint: "まず $$y'$$ から接点の傾きを出し、交点は連立して重根を除きます。",
  },
  5: {
    title: "入試・総合",
    problem:
      "正の実数 $$a,b,c$$ が $$a+b+c=abc$$ を満たすとき、$$\\dfrac{1}{a}+\\dfrac{1}{b}+\\dfrac{1}{c}$$ の最小値を求めよ。等号成立条件も述べよ。",
    hint: "逆数をとると $$\\sum 1/a = \\sum bc$$ などに帰着できます。相加相乗も有効です。",
  },
};

const PHYSICS: Record<Tier, Omit<LevelSample, "band" | "bandHint">> = {
  1: {
    title: "等速直線運動",
    problem: "速さ $$6\\,\\mathrm{m/s}$$ の物体が $$8\\,\\mathrm{s}$$ 間に進む距離を求めよ。",
    hint: "距離 $$=$$ 速さ $$\\times$$ 時間 です。",
  },
  2: {
    title: "運動方程式",
    problem:
      "質量 $$2\\,\\mathrm{kg}$$ の物体に水平方向へ $$10\\,\\mathrm{N}$$ の力を加える。加速度の大きさを求めよ（摩擦は無視）。",
    hint: "$$F=ma$$ を使います。",
  },
  3: {
    title: "力学的エネルギー",
    problem:
      "高さ $$5\\,\\mathrm{m}$$ から質量 $$0.4\\,\\mathrm{kg}$$ の小球を静かに放す。地面に達する直前の速さはいくらか。$$g=10\\,\\mathrm{m/s^2}$$ とし、空気抵抗は無視する。",
    hint: "$$mgh=\\frac{1}{2}mv^2$$ で位置エネルギーが運動エネルギーに変わります。",
  },
  4: {
    title: "電磁誘導",
    problem:
      "一様磁場 $$B$$ の中を、長さ $$\\ell$$ の導体棒が速さ $$v$$ でレール上を滑る。回路の抵抗が $$R$$ のみのとき、誘導電流の大きさを求めよ。",
    hint: "磁束の変化 $$\\Phi=B\\ell x$$ からファラデーの法則を使います。",
  },
  5: {
    title: "入試・総合",
    problem:
      "単振り子（長さ $$\\ell$$）を振幅が小さくない角度 $$\\theta_0$$ から静かに放す。最下点での速さを $$\\ell,g,\\theta_0$$ で表せ。微小振動近似は用いないこと。",
    hint: "力学的エネルギー保存で、高さ差は $$\\ell(1-\\cos\\theta_0)$$ です。",
  },
};

const CHEMISTRY: Record<Tier, Omit<LevelSample, "band" | "bandHint">> = {
  1: {
    title: "モルの計算",
    problem: "水 $$18\\,\\mathrm{g}$$ は何 mol か。原子量は $$\\mathrm{H}=1,\\ \\mathrm{O}=16$$ とする。",
    hint: "モル質量で割ります。$$\\mathrm{H_2O}$$ は $$18\\,\\mathrm{g/mol}$$ です。",
  },
  2: {
    title: "化学反応式",
    problem:
      "$$2\\mathrm{H_2}+\\mathrm{O_2}\\to 2\\mathrm{H_2O}$$ において、水素 $$4\\,\\mathrm{mol}$$ を完全反応させるのに必要な酸素は何 mol か。",
    hint: "係数比 $$\\mathrm{H_2}:\\mathrm{O_2}=2:1$$ を使います。",
  },
  3: {
    title: "化学平衡",
    problem:
      "反応 $$\\mathrm{A}\\rightleftharpoons\\mathrm{B}$$ で $$K=2.0$$。初期 $$[\\mathrm{A}]=1.0\\,\\mathrm{M}$$、$$[\\mathrm{B}]=0$$ のときの平衡濃度 $$[\\mathrm{B}]$$ を求めよ。",
    hint: "変化量を $$x$$ とおき、$$K=x/(1-x)$$ を解きます。",
  },
  4: {
    title: "有機・構造",
    problem:
      "アセト酢酸エチルのケト–エノール平衡で、極性プロトン性溶媒（MeOH）ではケト形が有利になりやすい理由を、水素結合の観点から述べよ。",
    hint: "溶媒が分子内水素結合を壊し、カルボニルが安定化されるかを考えます。",
  },
  5: {
    title: "入試・総合",
    problem:
      "$$0.10\\,\\mathrm{mol/L}$$ の弱酸 $$\\mathrm{HA}$$（$$K_a=1.0\\times 10^{-5}$$）の $$\\mathrm{pH}$$ を求めよ。水の電離は無視してよい。有効数字2桁。",
    hint: "$$[\\mathrm{H^+}]\\approx\\sqrt{K_a C}$$ から $$\\mathrm{pH}=-\\log_{10}[\\mathrm{H^+}]$$ です。",
  },
};

const BY_SUBJECT: Record<Subject, Record<Tier, Omit<LevelSample, "band" | "bandHint">>> = {
  math: MATH,
  physics: PHYSICS,
  chemistry: CHEMISTRY,
};

export function levelSample(subject: Subject, tier: Tier): LevelSample {
  const band = bandOf(tier);
  return { ...band, ...BY_SUBJECT[subject][tier] };
}
