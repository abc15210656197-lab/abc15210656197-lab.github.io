export const massRatio = 81.3; // Earth mass / Moon mass
export const R = 20; // Scaled distance between Earth and Moon
export const R_bary = R / (1 + massRatio);
export const R_moon = R - R_bary;
export const r_hill = R * Math.pow(1 / (3 * massRatio), 1/3);

export const points = {
  Barycenter: [0, 0, 0] as [number, number, number],
  L1: [R_moon - r_hill, 0, 0] as [number, number, number],
  L2: [R_moon + r_hill, 0, 0] as [number, number, number],
  L3: [-R_bary - R, 0, 0] as [number, number, number],
  L4: [R/2 - R_bary, 0, -R * Math.sqrt(3)/2] as [number, number, number],
  L5: [R/2 - R_bary, 0, R * Math.sqrt(3)/2] as [number, number, number],
};

const G = 150;
const m1 = 1;
const m2 = 1 / massRatio;
const omega2 = (G * (m1 + m2)) / Math.pow(R_bary + R_moon, 3);

// Calculate potential at L4 to use as an offset so L4 is exactly at z=0
const l4_x = points.L4[0];
const l4_y = points.L4[2];
const d1_l4 = Math.sqrt(Math.pow(l4_x - (-R_bary), 2) + Math.pow(l4_y, 2));
const d2_l4 = Math.sqrt(Math.pow(l4_x - R_moon, 2) + Math.pow(l4_y, 2));
const r_l4 = Math.sqrt(l4_x * l4_x + l4_y * l4_y);
const pot1_l4 = -G * m1 / Math.max(d1_l4, 0.05);
const pot2_l4 = -G * m2 / Math.max(d2_l4, 0.05);
const centrifugal_l4 = -0.5 * omega2 * r_l4 * r_l4;
const L4_POTENTIAL = pot1_l4 + pot2_l4 + centrifugal_l4;

export const getPotential = (x: number, y: number) => {
  const d1 = Math.sqrt(Math.pow(x - (-R_bary), 2) + Math.pow(y, 2));
  const d2 = Math.sqrt(Math.pow(x - R_moon, 2) + Math.pow(y, 2));
  const r = Math.sqrt(x * x + y * y);
  
  const pot1 = -G * m1 / Math.max(d1, 0.05);
  const pot2 = -G * m2 / Math.max(d2, 0.05);
  const centrifugal = -0.5 * omega2 * r * r;
  
  let z = pot1 + pot2 + centrifugal;
  z = z - L4_POTENTIAL; // Shift so L4/L5 are at z=0 (touching the orbital plane)
  z = Math.max(z, -150);
  z = Math.min(z, 5);
  return z;
};

export const lagrangeData = {
  intro: {
    title: "什么是拉格朗日点？",
    description: "想象一下，地球和月球就像两个深度不同的“旋转沙漏”（引力漏斗）。当它们绕着共同的中心旋转时，如果你把一个小球放在空间中的某个特定位置，它既不会掉进地球或月球的沙漏里，也不会被甩飞出去，而是能奇迹般地与地月保持相对静止——这个能让小球“悬停”不动的位置，就是拉格朗日点。",
    details: "在这个高精度物理模型中，我们展示了地月系统的五个引力平衡点（L1-L5）。点击左上角的“引力漏斗”图标（图层按钮），你就能直观地看到这两个旋转的“沙漏”！拉格朗日点就位于这些势能曲面的“平坦处”或“马鞍面”上。",
    formula: "拉格朗日点是限制性三体问题中的五个特解。在两个大质量天体（如地球和月球）的引力场中，第三个小质量物体的引力和离心力达到平衡的点。"
  },
  Barycenter: {
    title: "系统质心 (Barycenter)",
    description: "地球和月球的公共质量中心。因为地球质量是月球的约81倍，质心非常靠近地球，实际上位于地球内部（距地心约4670公里）。",
    details: "区别：质心是两个天体相互绕转的几何中心，是整个系统的动力学中心；而拉格朗日点是第三个微小物体（如卫星）在引力和离心力作用下能保持相对静止的五个特定位置。",
    formula: "r₁ = R * m₂ / (m₁ + m₂)\n其中 r₁ 是主星到质心的距离，R 是两星总距离，m₁ 和 m₂ 是两星质量。",
    color: "#ffffff"
  },
  L1: {
    title: "L1 点",
    description: "位于地球和月球连线之间，距离月球约 5.8 万公里。",
    details: "用途：地月 L1 点是建立地月空间站的理想位置，可以作为前往月球或深空的“中转站”，并且能保持与地球和月球的持续通信。",
    formula: "近似计算（希尔球半径）：\nr ≈ R * (m₂ / (3 * m₁))^(1/3)\n精确位置需要求解五次方程。",
    color: "#ff3366"
  },
  L2: {
    title: "L2 点",
    description: "位于地月连线上，在月球的背面外侧，距离月球约 6.4 万公里。",
    details: "用途：由于月球的潮汐锁定，我们在地球上永远看不到月球背面。部署在地月 L2 点的中继卫星（如中国的“鹊桥”号）可以为月球背面的探测器提供与地球的通信中继。",
    formula: "近似计算：\nr ≈ R * (m₂ / (3 * m₁))^(1/3)\n与 L1 类似，精确位置需求解五次方程。",
    color: "#33ccff"
  },
  L3: {
    title: "L3 点",
    description: "位于地月连线上，在地球的另一侧，距离地球约 38 万公里（略远于月球轨道）。",
    details: "特点：地月 L3 点受到太阳引力的摄动非常大，因此极不稳定，目前没有太大的实际航天应用价值。",
    formula: "近似计算：\nr ≈ R * (1 + 5 * m₂ / (12 * m₁))\n位于较小天体对侧，距离较大天体略远于两星距离。",
    color: "#ffcc00"
  },
  L4: {
    title: "L4 点",
    description: "位于月球轨道的前方 60 度，与地球和月球组成一个等边三角形。",
    details: "特点：L4 和 L5 是稳定的平衡点。在地月系统的 L4 和 L5 点，存在着由星际尘埃组成的微弱云团，被称为“科迪莱夫斯基云”（Kordylewski clouds）。",
    formula: "位置：与两主星构成等边三角形。\n稳定性条件：m₁ / m₂ > 24.96（地月系统满足此条件，因此是稳定的）。",
    color: "#33ff99"
  },
  L5: {
    title: "L5 点",
    description: "位于月球轨道的后方 60 度，与地球和月球组成一个等边三角形。",
    details: "特点：与 L4 一样，L5 也是稳定的。在未来的太空开发构想中，地月 L4 和 L5 被认为是建设大型太空殖民地（如奥尼尔圆柱体）的绝佳位置。",
    formula: "位置：与两主星构成等边三角形。\n稳定性条件：m₁ / m₂ > 24.96（地月系统满足此条件，因此是稳定的）。",
    color: "#9933ff"
  }
};
