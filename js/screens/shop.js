// screens/shop.js — Item shop screen
import state from '../state.js';

const ITEMS = [
  { id: 'net_speed',    name: '网兜加速',   effect: '本关网兜伸缩速度+50%',       price: 50,  type: 'passive', icon: '⚡' },
  { id: 'star_magnet',  name: '磁力星引',   effect: '50px内星星主动向网兜靠近',   price: 80,  type: 'passive', icon: '🧲' },
  { id: 'space_bomb',   name: '宇宙炸弹',   effect: '一键摧毁屏幕内所有垃圾',    price: 100, type: 'active',  icon: '💣' },
  { id: 'time_ext',     name: '时间延长',   effect: '当前关卡+20秒',             price: 60,  type: 'active',  icon: '⏱️' },
  { id: 'shrink_debris',name: '缩小垃圾',   effect: '本关所有垃圾缩小50%',       price: 40,  type: 'passive', icon: '🔬' },
  { id: 'double_coins', name: '双倍金币',   effect: '本关金币奖励×2',            price: 30,  type: 'passive', icon: '🪙' },
  { id: 'star_map',     name: '星图揭示',   effect: '显示半透明星座连线提示',    price: 20,  type: 'passive', icon: '🗺️' },
  { id: 'glove',        name: '宇航员手套', effect: '抓到垃圾时不损失时间',      price: 70,  type: 'passive', icon: '🧤' },
];

export function initShop(navigate) {
  _renderShop(navigate);

  const btnBack = document.querySelector('.btn-back-levels-from-shop');
  if (btnBack) btnBack.onclick = () => navigate('levels');
}

function _renderShop(navigate) {
  // Update coin balance
  _updateBalance();

  const grid = document.querySelector('.shop-grid');
  if (!grid) return;

  grid.innerHTML = '';

  ITEMS.forEach(item => {
    const owned  = state.getItemQty(item.id);
    const enough = state.coins >= item.price;

    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-name">${item.name}</div>
      <div class="shop-item-effect">${item.effect}</div>
      <div class="shop-item-type ${item.type === 'active' ? 'type-active' : 'type-passive'}">
        ${item.type === 'active' ? '消耗型' : '持续型'}
      </div>
      <div class="shop-item-footer">
        <span class="shop-item-price">🪙 ${item.price}</span>
        ${owned > 0 ? `<span class="shop-owned-badge">已持有 ×${owned}</span>` : ''}
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
