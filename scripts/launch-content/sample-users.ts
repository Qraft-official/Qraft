export type SampleTrack = "math" | "physics" | "chemistry" | "logic";

export type SampleUserDef = {
  seedKey: string;
  handle: string;
  name: string;
  bio: string;
  tracks: SampleTrack[];
  mathTier: 1 | 2 | 3 | 4 | 5;
  physicsTier: 1 | 2 | 3 | 4 | 5;
  chemistryTier: 1 | 2 | 3 | 4 | 5;
};

export const SAMPLE_USERS: SampleUserDef[] = [
  { seedKey: "sample_user_001", handle: "math_kai", name: "math_kai", bio: "整数問題好き", tracks: ["math"], mathTier: 4, physicsTier: 2, chemistryTier: 2 },
  { seedKey: "sample_user_002", handle: "yuto_calc", name: "yuto_calc", bio: "計算が好き", tracks: ["math"], mathTier: 3, physicsTier: 2, chemistryTier: 2 },
  { seedKey: "sample_user_003", handle: "mikan_math", name: "mikan_math", bio: "数列ばっか解いてます", tracks: ["math"], mathTier: 3, physicsTier: 1, chemistryTier: 2 },
  { seedKey: "sample_user_004", handle: "riku", name: "riku", bio: "解けた瞬間が好き", tracks: ["math", "logic"], mathTier: 3, physicsTier: 2, chemistryTier: 1 },
  { seedKey: "sample_user_005", handle: "sora_phys", name: "sora_phys", bio: "物理と数学", tracks: ["physics", "math"], mathTier: 3, physicsTier: 4, chemistryTier: 2 },
  { seedKey: "sample_user_006", handle: "nagi", name: "nagi", bio: "図形が好き", tracks: ["math"], mathTier: 4, physicsTier: 2, chemistryTier: 1 },
  { seedKey: "sample_user_007", handle: "pencil_7", name: "pencil_7", bio: "パズル系が好き", tracks: ["logic", "math"], mathTier: 3, physicsTier: 2, chemistryTier: 2 },
  { seedKey: "sample_user_008", handle: "sigma", name: "sigma", bio: "微積好き", tracks: ["math"], mathTier: 5, physicsTier: 3, chemistryTier: 2 },
  { seedKey: "sample_user_009", handle: "kosen_math", name: "kosen_math", bio: "高専数学", tracks: ["math"], mathTier: 4, physicsTier: 3, chemistryTier: 3 },
  { seedKey: "sample_user_010", handle: "rei", name: "rei", bio: "証明短め希望", tracks: ["math"], mathTier: 3, physicsTier: 2, chemistryTier: 1 },
  { seedKey: "sample_user_011", handle: "haru", name: "haru", bio: "毎日1問", tracks: ["math"], mathTier: 2, physicsTier: 2, chemistryTier: 2 },
  { seedKey: "sample_user_012", handle: "integral", name: "integral", bio: "積分が好き", tracks: ["math"], mathTier: 4, physicsTier: 3, chemistryTier: 1 },
  { seedKey: "sample_user_013", handle: "vector_kun", name: "vector_kun", bio: "ベクトル沼", tracks: ["math"], mathTier: 3, physicsTier: 3, chemistryTier: 1 },
  { seedKey: "sample_user_014", handle: "photon", name: "photon", bio: "光と波", tracks: ["physics"], mathTier: 3, physicsTier: 4, chemistryTier: 2 },
  { seedKey: "sample_user_015", handle: "mole_chem", name: "mole_chem", bio: "化学の問題集め", tracks: ["chemistry"], mathTier: 2, physicsTier: 2, chemistryTier: 4 },
  { seedKey: "sample_user_016", handle: "ion_lab", name: "ion_lab", bio: "反応式が好き", tracks: ["chemistry"], mathTier: 2, physicsTier: 2, chemistryTier: 4 },
  { seedKey: "sample_user_017", handle: "puzzle_ao", name: "puzzle_ao", bio: "論理パズル中心", tracks: ["logic"], mathTier: 3, physicsTier: 1, chemistryTier: 1 },
  { seedKey: "sample_user_018", handle: "logic_neko", name: "logic_neko", bio: "場合分けが好き", tracks: ["logic", "math"], mathTier: 3, physicsTier: 1, chemistryTier: 1 },
  { seedKey: "sample_user_019", handle: "geo_suzu", name: "geo_suzu", bio: "幾何好き", tracks: ["math"], mathTier: 4, physicsTier: 2, chemistryTier: 1 },
  { seedKey: "sample_user_020", handle: "seq_hiro", name: "seq_hiro", bio: "漸化式まわり", tracks: ["math"], mathTier: 3, physicsTier: 2, chemistryTier: 1 },
  { seedKey: "sample_user_021", handle: "wave_k", name: "wave_k", bio: "波動と干渉", tracks: ["physics"], mathTier: 3, physicsTier: 4, chemistryTier: 2 },
  { seedKey: "sample_user_022", handle: "newton_jr", name: "newton_jr", bio: "力学から入る", tracks: ["physics", "math"], mathTier: 3, physicsTier: 4, chemistryTier: 1 },
  { seedKey: "sample_user_023", handle: "orbit", name: "orbit", bio: "円運動が好き", tracks: ["physics"], mathTier: 3, physicsTier: 3, chemistryTier: 1 },
  { seedKey: "sample_user_024", handle: "alkene", name: "alkene", bio: "有機ちょっと", tracks: ["chemistry"], mathTier: 2, physicsTier: 1, chemistryTier: 4 },
  { seedKey: "sample_user_025", handle: "titrate", name: "titrate", bio: "定量が好き", tracks: ["chemistry"], mathTier: 2, physicsTier: 2, chemistryTier: 3 },
  { seedKey: "sample_user_026", handle: "olymp_rio", name: "olymp_rio", bio: "数オリ系の問い", tracks: ["math", "logic"], mathTier: 5, physicsTier: 2, chemistryTier: 1 },
  { seedKey: "sample_user_027", handle: "proof_mai", name: "proof_mai", bio: "証明問題多め", tracks: ["math"], mathTier: 5, physicsTier: 2, chemistryTier: 1 },
  { seedKey: "sample_user_028", handle: "combo_ken", name: "combo_ken", bio: "組合せ好き", tracks: ["math", "logic"], mathTier: 4, physicsTier: 1, chemistryTier: 1 },
  { seedKey: "sample_user_029", handle: "delta_pi", name: "delta_pi", bio: "極限と級数", tracks: ["math"], mathTier: 4, physicsTier: 3, chemistryTier: 1 },
  { seedKey: "sample_user_030", handle: "aha_yui", name: "aha_yui", bio: "ひらめき待ち", tracks: ["logic", "math"], mathTier: 3, physicsTier: 2, chemistryTier: 2 },
];
