// screens/shop.js — Item shop screen
import state from '../state.js';

const ITEMS = [
  { id: 'net_speed',    name: '网兜加速',   effect: '激活后15秒内网兜速度+50%',         price: 50,  type: 'active',  icon: '⚡', duration: '15秒' },
  { id: 'net_enlarge',  name: '网兜扩大',   effect: '激活后15秒内网兜口径增大50%',       price: 60,  type: 'active',  icon: '🪢', duration: '15秒' },
  { id: 'space_bomb',   name: '宇宙炸弹',   effect: '激活后即时摧毁当前抓住的垃圾并重置网兜',    price: 100, type: 'active',  icon: '💣', duration: '即时' },
  { id: 'time_ext',     name: '时间延长',   effect: '即时+20秒剩余时间',                price: 60,  type: 'active',  icon: '⏱️', duration: '即时' },
  { id: 'shrink_debris',name: '缩小垃圾',   effect: '激活后30秒内所有垃圾缩小50%',      price: 40,  type: 'active',  icon: '🔬', duration: '30秒' },
  { id: 'star_map',     name: '星图揭示',   effect: '激活后60秒显示星座连线提示',        price: 20,  type: 'active',  icon: '🗺️', duration: '60秒' },
  { id: 'glove',        name: '宇航员手套', effect: '激活后30秒内抓到垃圾不减速（正常速度返回）', price: 70,  type: 'active',  icon: '🧤', duration: '30秒' },
  { id: 'double_coins', name: '双倍金币',   effect: '本关金币奖励自动×2（被动，不占槽）', price: 30,  type: 'passive', icon: '🪙', duration: '全局' },
];

export function initShop(navigate, params) {
  _renderShop(navigate);

  const btnBack = document.querySelector('.btn-back-from-shop');
  if (btnBack) {
    const from = params?.from || 'levels';
    btnBack.textContent = from === 'menu' ? '← 返回主菜单' : '← 返回选关';
    btnBack.onclick = () => navigate(from === 'menu' ? 'menu' : 'levels');
  }
}

function _renderShop(navigate) {
  _updateBalance();

  const grid = document.querySelector('.shop-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Type legend
  const legend = document.createElement('div');
  legend.className = 'shop-type-legend';
  legend.innerHTML = '<strong>主动</strong> = 赛前选最多3个，按 1/2/3 激活，限时生效 ｜ <strong>被动</strong> = 自动生效，不占道具槽';
  grid.appendChild(legend);

  ITEMS.forEach(item => {
    const owned  = state.getItemQty(item.id);
    const enough = state.coins >= item.price;

    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-effect">${item.effect}</div>
      <div class="shop-item-meta">
        <div class="shop-item-type ${item.type === 'active' ? 'type-active' : 'type-passive'}">
          ${item.type === 'active' ? '主动' : '被动'}
        </div>
        <div class="shop-item-duration">${item.duration}</div>
      </div>
      <div class="shop-item-footer">
        <span class="shop-item-price">🪙 ${item.price}</span>
        <span class="shop-owned-count ${owned > 0 ? 'has-items' : ''}">持有: ×${owned}</span>
      </div>
      <button class="btn btn-primary shop-buy-btn ${!enough ? 'disabled' : ''}"
              data-id="${item.id}"
              ${!enough ? 'disabled' : ''}>
        ${enough ? '购买' : '金币不足'}
      </button>
    `;

    const btn = card.querySelector('.shop-buy-btn');
    if (enough) {
      btn.addEventListener('click', () => {
        if (state.spendCoins(item.price)) {
          state.addItem(item.id, 1);
          _animatePurchase(btn);
          _renderShop(navigate);
        }
      });
    }

    grid.appendChild(card);
  });
}

function _updateBalance() {
  const el = document.querySelector('.shop-coin-balance');
  if (el) el.textContent = state.coins;
}

function _animatePurchase(btn) {
  btn.textContent = '✓ 已购买';
  btn.classList.add('purchased');
  setTimeout(() => {
    btn.textContent = '购买';
    btn.classList.remove('purchased');
  }, 800);
}
