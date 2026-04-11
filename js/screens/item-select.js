// screens/item-select.js — Pre-level item selection overlay
import state from '../state.js';

// Item definitions for the selection screen
const ACTIVE_ITEMS = [
  { id: 'net_speed',     name: '网兜加速',    icon: '⚡', desc: '15秒内网兜速度+50%',     duration: 15 },
  { id: 'star_magnet',   name: '磁力星引',    icon: '🧲', desc: '30秒内星星向网兜聚集',   duration: 30 },
  { id: 'space_bomb',    name: '宇宙炸弹',    icon: '💣', desc: '即时摧毁所有垃圾',       duration: 0  },
  { id: 'time_ext',      name: '时间延长',    icon: '⏱️', desc: '立即+20秒',              duration: 0  },
  { id: 'shrink_debris', name: '缩小垃圾',    icon: '🔬', desc: '30秒内垃圾缩小50%',      duration: 30 },
  { id: 'star_map',      name: '星图揭示',    icon: '🗺️', desc: '60秒显示星座连线提示',   duration: 60 },
  { id: 'glove',         name: '宇航员手套',  icon: '🧤', desc: '30秒内抓垃圾不扣时间',   duration: 30 },
];

const PASSIVE_ITEMS = [
  { id: 'double_coins',  name: '双倍金币',    icon: '🪙', desc: '本关金币奖励×2（自动）' },
];

const MAX_SLOTS = 3;

export function showItemSelect(onConfirm) {
  // Check if player has any active items
  const ownedActive = ACTIVE_ITEMS.filter(item => state.getItemQty(item.id) > 0);
  const ownedPassive = PASSIVE_ITEMS.filter(item => state.getItemQty(item.id) > 0);

  if (ownedActive.length === 0 && ownedPassive.length === 0) {
    // No items owned — skip selection
    state.selectedItems = [];
    onConfirm();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'item-select-overlay';
  overlay.className = 'item-select-overlay';

  let selected = []; // array of item IDs (up to MAX_SLOTS)

  function render() {
    overlay.innerHTML = `
      <div class="item-select-modal">
        <h2 class="item-select-title">选择道具</h2>
        <p class="item-select-hint">最多选择 <strong>${MAX_SLOTS}</strong> 个主动道具，按 1/2/3 键激活</p>

        ${ownedActive.length > 0 ? `
          <div class="item-select-section-label">主动道具（手动激活）</div>
          <div class="item-select-grid" id="active-grid">
            ${ownedActive.map(item => {
              const slotIdx = selected.indexOf(item.id);
              const isSelected = slotIdx >= 0;
              const qty = state.getItemQty(item.id);
              return `
                <div class="item-select-card ${isSelected ? 'selected' : ''}" data-id="${item.id}">
                  ${isSelected ? `<span class="item-slot-badge">${slotIdx + 1}</span>` : ''}
                  <span class="item-sel-icon">${item.icon}</span>
                  <span class="item-sel-name">${item.name}</span>
                  <span class="item-sel-desc">${item.desc}</span>
                  <span class="item-sel-qty">持有: ×${qty}</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${ownedPassive.length > 0 ? `
          <div class="item-select-section-label">被动道具（自动生效）</div>
          <div class="item-select-passive-row">
            ${ownedPassive.map(item => `
              <div class="item-select-passive-card">
                <span class="item-sel-icon">${item.icon}</span>
                <span class="item-sel-name">${item.name}</span>
                <span class="item-sel-desc">${item.desc}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="item-select-actions">
          <button class="btn btn-primary item-confirm-btn">
            开始关卡 ${selected.length > 0 ? `（${selected.length}个道具）` : '（不带道具）'}
          </button>
        </div>
      </div>
    `;

    // Wire active card clicks
    overlay.querySelectorAll('.item-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const idx = selected.indexOf(id);
        if (idx >= 0) {
          selected.splice(idx, 1);
        } else if (selected.length < MAX_SLOTS) {
          selected.push(id);
        }
        render();
      });
    });

    // Wire confirm button
    overlay.querySelector('.item-confirm-btn').addEventListener('click', () => {
      state.selectedItems = [...selected];
      overlay.remove();
      onConfirm();
    });
  }

  render();
  document.body.appendChild(overlay);
}
