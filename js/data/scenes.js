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
  },
];
