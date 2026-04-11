// data/scenes.js — Scene palette definitions for the 6 New Zealand location groups
// Scene index = Math.floor(levelIdx / 5)
// Each scene covers 5 consecutive levels.

export const SCENE_PALETTES = [
  {
    // Scene 0: 特卡波湖牧羊人小屋 (Tekapo Shepherd's Church) — classic deep blue-violet
    name: '特卡波湖·牧羊人小屋',
    sky0: '#050816',    // zenith
    sky1: '#0d1230',    // mid sky
    sky2: '#1a0d2e',    // horizon
    starColor: '#ffffff',
    starAlpha: 0.7,
    aurora: false,
    // Ground: rolling hills + lake surface, warm amber glow on horizon
    groundColor: '#0a0618',
    groundGlow: 'rgba(80, 40, 10, 0.25)',
    groundType: 'tekapo-church',
  },
  {
    // Scene 1: 库克山山顶雪景 (Aoraki/Mt Cook Summit Snow) — cold blue-white
    name: '库克山·山顶雪景',
    sky0: '#03091a',
    sky1: '#0a1535',
    sky2: '#0f1e45',
    starColor: '#cce8ff',
    starAlpha: 0.85,
    aurora: false,
    groundColor: '#05101e',
    groundGlow: 'rgba(100, 160, 220, 0.18)',
    groundType: 'cook-peaks',
  },
  {
    // Scene 2: 特卡波湖夏夜全景 (Tekapo Summer Night) — warm indigo-blue
    name: '特卡波湖·夏夜全景',
    sky0: '#080618',
    sky1: '#141040',
    sky2: '#241558',
    starColor: '#ffeedd',
    starAlpha: 0.75,
    aurora: false,
    groundColor: '#06041a',
    groundGlow: 'rgba(60, 30, 80, 0.20)',
    groundType: 'tekapo-panorama',
  },
  {
    // Scene 3: 库克山山谷营地 (Mt Cook Valley Camp) — amber-tinged valley night
    name: '库克山·山谷营地',
    sky0: '#060410',
    sky1: '#120c22',
    sky2: '#261428',
    starColor: '#ffd090',
    starAlpha: 0.70,
    aurora: false,
    groundColor: '#0a0810',
    groundGlow: 'rgba(120, 80, 20, 0.22)',
    groundType: 'cook-valley',
  },
  {
    // Scene 4: 特卡波湖冬夜极光 (Tekapo Winter Aurora) — aurora green-teal
    name: '特卡波湖·冬夜极光',
    sky0: '#030d10',
    sky1: '#071820',
    sky2: '#0d2e1a',
    starColor: '#aaffee',
    starAlpha: 0.65,
    aurora: true,
    groundColor: '#040c0a',
    groundGlow: 'rgba(40, 180, 120, 0.20)',
    groundType: 'tekapo-winter',
  },
  {
    // Scene 5: 库克山破晓前最深夜空 (Aoraki Pre-Dawn Deep Sky) — near-black ultra-deep
    name: '库克山·破晓前深空',
    sky0: '#010208',
    sky1: '#040810',
    sky2: '#080c18',
    starColor: '#e8e0ff',
    starAlpha: 0.90,
    aurora: false,
    groundColor: '#030406',
    groundGlow: 'rgba(50, 50, 80, 0.15)',
    groundType: 'cook-predawn',
  },
];

// Ground silhouette drawing functions
// W, H = canvas dimensions; ctx = 2d context; groundColor, glowColor = strings
export function drawGroundSilhouette(ctx, W, H, sceneIdx) {
  const scene = SCENE_PALETTES[sceneIdx];
  const groundY = H * 0.76; // ground starts at 76% height
  ctx.save();

  // Glow fringe along horizon
  const glowGrad = ctx.createLinearGradient(0, groundY - H * 0.06, 0, groundY + H * 0.04);
  glowGrad.addColorStop(0, 'rgba(0,0,0,0)');
  glowGrad.addColorStop(0.5, scene.groundGlow);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, groundY - H * 0.06, W, H * 0.10);

  // Ground silhouette path
  ctx.beginPath();
  _buildGroundPath(ctx, W, H, groundY, scene.groundType);
  ctx.fillStyle = scene.groundColor;
  ctx.fill();

  ctx.restore();
}

function _buildGroundPath(ctx, W, H, baseY, type) {
  switch (type) {
    case 'tekapo-church':
      // Rolling hills, lake flat left side, slight church spire hint
      ctx.moveTo(0, H);
      ctx.lineTo(0, baseY + H * 0.04);
      ctx.bezierCurveTo(W * 0.08, baseY - H * 0.03, W * 0.18, baseY - H * 0.06, W * 0.28, baseY - H * 0.05);
      // Church spire suggestion
      ctx.lineTo(W * 0.30, baseY - H * 0.10);
      ctx.lineTo(W * 0.315, baseY - H * 0.06);
      ctx.bezierCurveTo(W * 0.42, baseY - H * 0.04, W * 0.55, baseY + H * 0.01, W * 0.70, baseY - H * 0.02);
      ctx.bezierCurveTo(W * 0.82, baseY - H * 0.04, W * 0.92, baseY + H * 0.005, W, baseY + H * 0.01);
      ctx.lineTo(W, H);
      ctx.closePath();
      break;

    case 'cook-peaks':
      // Dramatic jagged mountain peaks
      ctx.moveTo(0, H);
      ctx.lineTo(0, baseY + H * 0.05);
      ctx.lineTo(W * 0.08, baseY - H * 0.05);
      ctx.bezierCurveTo(W * 0.12, baseY - H * 0.08, W * 0.16, baseY - H * 0.18, W * 0.22, baseY - H * 0.14);
      ctx.lineTo(W * 0.28, baseY - H * 0.19);  // peak
      ctx.lineTo(W * 0.35, baseY - H * 0.08);
      ctx.bezierCurveTo(W * 0.40, baseY - H * 0.05, W * 0.44, baseY - H * 0.12, W * 0.50, baseY - H * 0.16); // peak 2
      ctx.lineTo(W * 0.56, baseY - H * 0.09);
      ctx.bezierCurveTo(W * 0.62, baseY - H * 0.04, W * 0.68, baseY - H * 0.13, W * 0.75, baseY - H * 0.20); // peak 3
      ctx.lineTo(W * 0.82, baseY - H * 0.06);
      ctx.bezierCurveTo(W * 0.88, baseY - H * 0.02, W * 0.95, baseY + H * 0.01, W, baseY + H * 0.02);
      ctx.lineTo(W, H);
      ctx.closePath();
      break;

    case 'tekapo-panorama':
      // Wide rolling low hills
      ctx.moveTo(0, H);
      ctx.lineTo(0, baseY + H * 0.02);
      ctx.bezierCurveTo(W * 0.15, baseY - H * 0.04, W * 0.30, baseY - H * 0.06, W * 0.45, baseY - H * 0.03);
      ctx.bezierCurveTo(W * 0.60, baseY, W * 0.75, baseY - H * 0.05, W * 0.90, baseY - H * 0.03);
      ctx.bezierCurveTo(W * 0.95, baseY - H * 0.02, W * 0.98, baseY, W, baseY + H * 0.01);
      ctx.lineTo(W, H);
      ctx.closePath();
      break;

    case 'cook-valley':
      // Valley walls rise on both sides; camp glow in center
      ctx.moveTo(0, H);
      ctx.lineTo(0, baseY - H * 0.10);
      ctx.bezierCurveTo(W * 0.05, baseY - H * 0.15, W * 0.12, baseY - H * 0.12, W * 0.22, baseY - H * 0.06);
      ctx.bezierCurveTo(W * 0.32, baseY - H * 0.02, W * 0.42, baseY + H * 0.01, W * 0.50, baseY);
      ctx.bezierCurveTo(W * 0.58, baseY + H * 0.01, W * 0.68, baseY - H * 0.02, W * 0.78, baseY - H * 0.06);
      ctx.bezierCurveTo(W * 0.88, baseY - H * 0.12, W * 0.95, baseY - H * 0.15, W, baseY - H * 0.10);
      ctx.lineTo(W, H);
      ctx.closePath();
      break;

    case 'tekapo-winter':
      // Low rolling winter hills, very dark
      ctx.moveTo(0, H);
      ctx.lineTo(0, baseY + H * 0.03);
      ctx.bezierCurveTo(W * 0.12, baseY - H * 0.05, W * 0.25, baseY - H * 0.07, W * 0.40, baseY - H * 0.04);
      ctx.bezierCurveTo(W * 0.55, baseY - H * 0.02, W * 0.65, baseY - H * 0.05, W * 0.80, baseY - H * 0.03);
      ctx.bezierCurveTo(W * 0.90, baseY - H * 0.02, W * 0.96, baseY + H * 0.01, W, baseY + H * 0.02);
      ctx.lineTo(W, H);
      ctx.closePath();
      break;

    case 'cook-predawn':
    default:
      // Dramatic single rocky peak silhouette, offset to one side
      ctx.moveTo(0, H);
      ctx.lineTo(0, baseY + H * 0.06);
      ctx.bezierCurveTo(W * 0.10, baseY + H * 0.03, W * 0.20, baseY - H * 0.02, W * 0.32, baseY - H * 0.05);
      ctx.bezierCurveTo(W * 0.38, baseY - H * 0.08, W * 0.42, baseY - H * 0.20, W * 0.47, baseY - H * 0.22); // main peak
      ctx.lineTo(W * 0.52, baseY - H * 0.12);
      ctx.bezierCurveTo(W * 0.60, baseY - H * 0.04, W * 0.72, baseY - H * 0.01, W * 0.85, baseY + H * 0.02);
      ctx.bezierCurveTo(W * 0.92, baseY + H * 0.03, W * 0.97, baseY + H * 0.03, W, baseY + H * 0.04);
      ctx.lineTo(W, H);
      ctx.closePath();
      break;
  }
}
