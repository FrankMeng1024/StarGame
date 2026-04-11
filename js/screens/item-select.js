// screens/item-select.js — Pre-level item selection overlay
import state from '../state.js';

// Item definitions for the selection screen
const ACTIVE_ITEMS = [
  { id: 'net_speed',     name: '网兜加速',    icon: '⚡', desc: '15秒内网兜速度+50%',     duration: 15 },
  { id: 'net_enlarge',   name: '网兜扩大',    icon: '🪢', desc: '15秒内网兜口径增大50%',   duration: 15 },
  { id: 'space_bomb',    name: '宇宙炸弹',    icon: '💣', desc: '即时摧毁当前抓住的垃圾', duration: 0  },
  { id: 'time_ext',      name: '时间延长',    icon: '⏱️', desc: '立即+20秒',              duration: 0  },
  { id: 'shrink_debris', name: '缩小垃圾',    icon: '🔬', desc: '30秒内垃圾缩小50%',      duration: 30 },
  { id: 'star_map',      name: '星图揭示',    icon: '🗺️', desc: '60秒显示星座连线提示',   duration: 60 },
  { id: 'glove',         name: '宇航员手套',  icon: '🧤', desc: '30秒内抓垃圾不减速',     duration: 30 },
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

  let selected = []; // array of item IDs (up to MAX_SLOTS, same type allowed multiple times)

  // Count how many times an item ID appears in selected
  function countSelected(id) { return selected.filter(x => x === id).length; }

  function render() {
    overlay.innerHTML = `
      <div class="item-select-modal">
        <h2 class="item-select-title">选择道具</h2>
        <p class="item-select-hint">最多选择 <strong>${MAX_SLOTS}</strong> 个主动道具（可选多个同类），按 1/2/3 键激活</p>

        ${ownedActive.length > 0 ? `
          <div class="item-select-section-label">主动道具（手动激活）</div>
          <div class="item-select-grid" id="active-grid">
            ${ownedActive.map(item => {
              const qty        = state.getItemQty(item.id);
              const selCount   = countSelected(item.id);
              const isSelected = selCount > 0;
              // Show slot indices for this item
              const slotIndices = [];
              let found = 0;
              for (let i = 0; i < selected.length; i++) {
                if (selected[i] === item.id) { slotIndices.push(i + 1); found++; }
              }
              const badgeHtml = slotIndices.map(n => `<span class="item-slot-badge">${n}</span>`).join('');
              const canAddMore = selected.length < MAX_SLOTS && selCount < qty;
              return `
                <div class="item-select-card ${isSelected ? 'selected' : ''}" data-id="${item.id}">
                  ${badgeHtml}
                  <span class="item-sel-icon">${item.icon}</span>
                  <span class="item-sel-name">${item.name}</span>
                  <span class="item-sel-desc">${item.desc}</span>
                  <span class="item-sel-qty">持有: ×${qty}${selCount > 0 ? ` | 已选: ×${selCount}` : ''}</span>
                  <div class="item-sel-controls">
                    ${isSelected ? `<button class="item-sel-minus" data-id="${item.id}">−</button>` : ''}
                    ${canAddMore ? `<button class="item-sel-plus" data-id="${item.id}">＋</button>` : ''}
                  </div>
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

    // Wire + / - buttons
    overlay.querySelectorAll('.item-sel-plus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (selected.length < MAX_SLOTS && countSelected(id) < state.getItemQty(id)) {
          selected.push(id);
          render();
        }
      });
    });
    overlay.querySelectorAll('.item-sel-minus').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const idx = selected.lastIndexOf(id);
        if (idx >= 0) { selected.splice(idx, 1); render(); }
      });
    });

    // Wire card click (toggle add/remove for simple single-click)
    overlay.querySelectorAll('.item-select-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const qty = state.getItemQty(id);
        const selCount = countSelected(id);
        if (selCount > 0) {
          // Remove one
          const idx = selected.lastIndexOf(id);
          selected.splice(idx, 1);
        } else if (selected.length < MAX_SLOTS) {
          // Add one
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
