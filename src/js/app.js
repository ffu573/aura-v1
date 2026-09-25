/* ============ AURA V1 核心逻辑 ============ */

// ---------- 工具 ----------
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function showModal(html) {
  $('#modalContent').innerHTML = html;
  $('#modalMask').style.display = 'grid';
}
function closeModal() {
  $('#modalMask').style.display = 'none';
}
$('#modalMask').addEventListener('click', e => {
  if (e.target === $('#modalMask')) closeModal();
});

// ---------- 时间问候 ----------
function setGreeting() {
  const h = new Date().getHours();
  const g = h < 6 ? '夜深了' : h < 12 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
  $('#greeting').textContent = g;
}
function updateClock() {
  const now = new Date();
  $('#statusTime').textContent =
    String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
}
setGreeting();
updateClock();
setInterval(updateClock, 30000);

// ---------- 启动页 → 主页 ----------
$('#grantPermBtn').addEventListener('click', () => {
  // 请求麦克风权限
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => toast('麦克风权限已开启'))
      .catch(() => toast('麦克风权限被拒绝，语音功能不可用'));
  }
  // 请求定位
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => console.log('定位:', pos.coords.latitude, pos.coords.longitude),
      () => console.log('定位被拒绝')
    );
  }
  switchPage('home');
});

// ---------- 底部导航 ----------
$$('.tab-item').forEach(tab => {
  tab.addEventListener('click', () => switchPage(tab.dataset.page));
});

function switchPage(name) {
  $$('.page').forEach(p => p.classList.remove('active'));
  $$('.tab-item').forEach(t => t.classList.remove('active'));
  $('#page-' + name).classList.add('active');
  document.querySelector(`.tab-item[data-page="${name}"]`)?.classList.add('active');
}

// ---------- 主题切换 ----------
function toggleTheme() {
  const cur = document.documentElement.dataset.theme;
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  $('#themeSwitch').classList.toggle('on', next === 'dark');
}
$('#themeBtn').addEventListener('click', toggleTheme);
$('#themeSwitch').addEventListener('click', toggleTheme);
$('#themeToggleItem').addEventListener('click', toggleTheme);

// ---------- 语音唤醒 "Rura" ----------
let recognition = null;
let wakeEnabled = true;

function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'zh-CN';

  recognition.onresult = e => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const text = e.results[i][0].transcript;
      // 检测唤醒词
      if (text.includes('Rura') || text.includes('rura') || text.includes('如拉') || text.includes('汝拉')) {
        wakeUp();
      }
    }
  };
  recognition.start();
}

function wakeUp() {
  $('#wakeOrb').classList.add('listening');
  switchPage('chat');
  toast('我在，请问需要什么帮助？');
  // 语音合成
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance('我在，请问需要什么帮助？');
    u.lang = 'zh-CN';
    speechSynthesis.speak(u);
  }
  setTimeout(() => $('#wakeOrb').classList.remove('listening'), 3000);
}

$('#wakeOrb').addEventListener('click', wakeUp);

$('#wakeSwitch').addEventListener('click', () => {
  wakeEnabled = !wakeEnabled;
  $('#wakeSwitch').classList.toggle('on', wakeEnabled);
  toast(wakeEnabled ? '语音唤醒已开启' : '语音唤醒已关闭');
});

// 启动语音识别
setTimeout(initSpeech, 1500);

// ---------- 对话 ----------
const messages = $('#messages');
const chatInput = $('#chatInput');

function addMsg(role, html) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = `<div class="bubble">${html}</div>`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

function streamReply(msg, text) {
  const bubble = msg.querySelector('.bubble');
  bubble.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
  let i = 0;
  setTimeout(() => {
    bubble.textContent = '';
    const iv = setInterval(() => {
      if (i >= text.length) { clearInterval(iv); return; }
      bubble.innerHTML = text.slice(0, ++i).replace(/\n/g, '<br>');
      messages.scrollTop = messages.scrollHeight;
    }, 20);
  }, 400);
}

// AI 回复路由
const replies = {
  外卖: () => startFoodDelivery(),
  闹钟: () => {
    showModal(`<h3>⏰ 定闹钟</h3>
      <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">手机熄屏状态下也能设定</p>
      <input type="time" id="alarmTime" style="width:100%;padding:14px;font-size:18px;background:var(--surface);border:1px solid var(--border);border-radius:12px;color:var(--text);">
      <input type="text" id="alarmLabel" placeholder="闹钟备注（如：起床）" style="width:100%;padding:12px;margin-top:10px;background:var(--surface);border:1px solid var(--border);border-radius:12px;color:var(--text);">
      <button class="btn-primary" id="setAlarmBtn" style="margin-top:16px;">设定闹钟</button>`);
    setTimeout(() => {
      $('#setAlarmBtn').onclick = () => {
        const t = $('#alarmTime').value || '08:00';
        const l = $('#alarmLabel').value || '闹钟';
        closeModal();
        toast(`闹钟已设定：${t} ${l}`);
        addMsg('ai', `✅ 已为你设定 ${t} 的闹钟（${l}），手机熄屏也会响。`);
      };
    }, 100);
  },
  代码: () => '好的，我来帮你写代码。你需要什么功能的代码？我可以生成并直接部署到云端服务器。',
  部署: () => '正在准备部署到强大的云端服务器... 支持 Vercel / AWS / 阿里云 / Docker。',
  视频: () => { switchPage('create'); return '已为你打开创作页面，生成视频请先选择软件。'; },
  图片: () => { switchPage('create'); $$('.create-tab')[1].click(); return '已打开图片生成。'; },
  家居: () => { switchPage('device'); return '已打开设备页面，智能家居需要先绑定才能使用。'; },
  浏览器: () => '已打开内置浏览器（请在设备页操作）。',
  游戏: () => '请确保手机已连接，告诉我游戏名称，我来接管角色操作。',
  default: () => '好的，我来帮你处理。'
};

function getReply(text) {
  for (const k in replies) {
    if (k !== 'default' && text.includes(k)) return replies[k]();
  }
  return replies.default();
}

function send(text) {
  if (!text.trim()) return;
  addMsg('user', text);
  chatInput.value = '';
  const reply = getReply(text);
  if (typeof reply === 'string') {
    const m = addMsg('ai', '');
    streamReply(m, reply);
  }
  // 如果是函数（启动流程），getReply 内部已处理
}

$('#sendBtn').addEventListener('click', () => send(chatInput.value));
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(chatInput.value); }
});

// 长按语音消息
const voicePress = $('#voicePressBtn');
let pressTimer = null;
let isRecording = false;

function startRecording() {
  isRecording = true;
  voicePress.classList.add('recording');
  voicePress.querySelector('span').textContent = '松开发送';
}
function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  voicePress.classList.remove('recording');
  voicePress.querySelector('span').textContent = '按住说话';
  // 发送语音消息
  addMsg('user', '<div class="voice-msg"><span class="voice-wave"><span></span><span></span><span></span><span></span></span><span style="font-size:12px;">3"</span></div>');
  setTimeout(() => {
    const m = addMsg('ai', '');
    streamReply(m, '收到你的语音消息，我来帮你处理。');
  }, 500);
}

// 鼠标/触摸长按
['mousedown','touchstart'].forEach(ev =>
  voicePress.addEventListener(ev, e => { e.preventDefault(); startRecording(); })
);
['mouseup','mouseleave','touchend','touchcancel'].forEach(ev =>
  voicePress.addEventListener(ev, stopRecording)
);

// 长按空格发语音
let spaceHeld = false;
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && document.activeElement !== chatInput && !spaceHeld) {
    spaceHeld = true;
    startRecording();
  }
});
document.addEventListener('keyup', e => {
  if (e.code === 'Space' && spaceHeld) {
    spaceHeld = false;
    stopRecording();
  }
});

// ---------- 主页快捷功能 ----------
$$('.quick-card').forEach(card => {
  card.addEventListener('click', () => {
    const action = card.dataset.action;
    if (action === '外卖') startFoodDelivery();
    else if (action === '闹钟') replies['闹钟']();
    else if (action === '视频' || action === '图片') { switchPage('create'); }
    else if (action === '家居') switchPage('device');
    else if (action === '浏览器') switchPage('device');
    else {
      switchPage('chat');
      send(card.querySelector('span').textContent);
    }
  });
});

// ---------- 外卖流程 ----------
const stores = [
  { brand: '蜀香麻辣烫', name: '蜀香麻辣烫(望京店)', rating: 4.8, distance: '0.8km', delivery: '¥3', time: '25分钟' },
  { brand: '蜀香麻辣烫', name: '蜀香麻辣烫(国贸店)', rating: 4.6, distance: '1.2km', delivery: '¥4', time: '30分钟' },
  { brand: '张亮麻辣烫', name: '张亮麻辣烫(三里屯店)', rating: 4.5, distance: '0.5km', delivery: '¥2', time: '20分钟' },
  { brand: '杨国福麻辣烫', name: '杨国福麻辣烫(朝阳店)', rating: 4.7, distance: '1.5km', delivery: '¥3', time: '28分钟' },
  { brand: '麦当劳', name: '麦当劳(王府井店)', rating: 4.4, distance: '1.0km', delivery: '¥5', time: '22分钟' },
];

// 真实菜单
const menus = {
  '蜀香麻辣烫(望京店)': [
    { name: '招牌麻辣烫', desc: '丸子·蔬菜·宽粉', price: 28 },
    { name: '肥牛麻辣烫', desc: '肥牛卷·豆皮·青菜', price: 35 },
    { name: '单人套餐', desc: '麻辣烫+酸梅汤', price: 32 },
    { name: '秘制调料', desc: '麻酱·蒜蓉·辣椒油', price: 3 },
  ],
  '张亮麻辣烫(三里屯店)': [
    { name: '经典麻辣烫', desc: '自选食材约500g', price: 26 },
    { name: '海鲜麻辣烫', desc: '虾·鱿鱼·鱼丸', price: 38 },
    { name: '冰镇酸梅汤', desc: '大杯', price: 8 },
  ],
  default: [
    { name: '招牌套餐', desc: '主食+配菜+饮料', price: 30 },
    { name: '加料', desc: '蛋·肠·菜', price: 6 },
    { name: '饮料', desc: '可乐/雪碧', price: 5 },
  ],
};

let currentStore = null;
let cart = {};

function startFoodDelivery() {
  switchPage('chat');
  const m = addMsg('ai', '');
  streamReply(m, '📍 正在获取你的位置...\n\n已定位：北京市朝阳区\n附近找到 5 家麻辣烫店，你想去哪家？也可以告诉我品牌名。');
  setTimeout(() => showStoreList(), 2500);
}

function showStoreList() {
  let html = '<h3>🍜 附近的麻辣烫</h3><p style="color:var(--text-dim);font-size:12px;margin-bottom:12px;">📍 北京市朝阳区 · 按距离排序</p><div class="menu-list">';
  stores.forEach(s => {
    html += `<div class="menu-item" onclick="selectStore('${s.name}')">
      <div>
        <div class="menu-item-name">${s.name}</div>
        <div class="menu-item-desc">⭐${s.rating} · ${s.distance} · ${s.time} · 配送${s.delivery}</div>
      </div>
      <div class="menu-item-right">
        <span style="font-size:11px;color:var(--text-dim);">选这家</span>
      </div>
    </div>`;
  });
  html += '</div>';
  // 品牌快捷筛选
  html += '<div style="margin-top:16px;"><div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">按品牌筛选：</div><div style="display:flex;gap:8px;flex-wrap:wrap;">';
  const brands = [...new Set(stores.map(s=>s.brand))];
  brands.forEach(b => html += `<button class="chip" onclick="filterBrand('${b}')">${b}</button>`);
  html += '</div></div>';
  showModal(html);
}

window.selectStore = function(name) {
  currentStore = stores.find(s => s.name === name);
  cart = {};
  closeModal();
  const m = addMsg('ai', '');
  streamReply(m, `已选择「${name}」，这是菜单，选好告诉我。`);
  setTimeout(() => showMenu(), 1500);
};

window.filterBrand = function(brand) {
  const filtered = stores.filter(s => s.brand === brand);
  let html = `<h3>🏷️ ${brand}</h3><div class="menu-list">`;
  filtered.forEach(s => {
    html += `<div class="menu-item" onclick="selectStore('${s.name}')">
      <div>
        <div class="menu-item-name">${s.name}</div>
        <div class="menu-item-desc">⭐${s.rating} · ${s.distance} · ${s.time}</div>
      </div>
      <span style="font-size:11px;color:var(--text-dim);">选这家</span>
    </div>`;
  });
  html += '</div>';
  showModal(html);
};

function showMenu() {
  const menu = menus[currentStore.name] || menus.default;
  let html = `<h3>📋 ${currentStore.name} 菜单</h3><div class="menu-list">`;
  menu.forEach((item, i) => {
    html += `<div class="menu-item">
      <div>
        <div class="menu-item-name">${item.name}</div>
        <div class="menu-item-desc">${item.desc}</div>
      </div>
      <div class="menu-item-right">
        <span class="menu-item-price">¥${item.price}</span>
        <button class="qty-btn" onclick="changeQty(${i},-1)">−</button>
        <span id="qty-${i}" style="min-width:18px;text-align:center;">0</span>
        <button class="qty-btn" onclick="changeQty(${i},1)">+</button>
      </div>
    </div>`;
  });
  html += '</div><div id="cartSummary" style="margin-top:16px;font-size:13px;"></div>';
  html += '<button class="btn-primary" id="checkoutBtn" style="margin-top:12px;">去结算</button>';
  showModal(html);
  window._menu = menu;
  $('#checkoutBtn').onclick = checkout;
}

window.changeQty = function(i, delta) {
  const key = window._menu[i].name;
  cart[key] = (cart[key] || 0) + delta;
  if (cart[key] < 0) cart[key] = 0;
  $('#qty-'+i).textContent = cart[key];
  updateCartSummary();
};

function updateCartSummary() {
  let total = 0, count = 0;
  for (const k in cart) {
    const item = window._menu.find(m => m.name === k);
    total += item.price * cart[k];
    count += cart[k];
  }
  $('#cartSummary').innerHTML = count > 0
    ? `已选 ${count} 件 · 合计 <strong style="color:var(--accent);">¥${total}</strong>`
    : '购物车是空的';
}

function checkout() {
  let total = 0;
  for (const k in cart) {
    const item = window._menu.find(m => m.name === k);
    total += item.price * cart[k];
  }
  if (total === 0) { toast('请先选择菜品'); return; }
  closeModal();
  // 付款码
  showModal(`<h3>💳 手动输入付款码</h3>
    <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">订单金额：¥${total}</p>
    <input type="text" class="paycode-input" id="paycode" placeholder="请输入付款码" maxlength="18">
    <button class="btn-primary" id="payBtn" style="margin-top:16px;">确认支付</button>`);
  $('#payBtn').onclick = () => {
    const code = $('#paycode').value;
    if (code.length < 6) { toast('请输入有效的付款码'); return; }
    closeModal();
    const m = addMsg('ai', '');
    streamReply(m, `✅ 支付成功！订单已提交。\n\n店铺：${currentStore.name}\n金额：¥${total}\n预计 ${currentStore.time} 送达`);
  };
}

// ---------- 智能家居（真实蓝牙搜索绑定） ----------
const homeDevices = []; // 初始为空，需用户真实搜索绑定

function renderDevices() {
  const list = $('#homeDevices');
  list.innerHTML = '';
  if (homeDevices.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-dim);">
      <div style="font-size:40px;margin-bottom:12px;">📡</div>
      <div style="font-size:14px;margin-bottom:6px;">还没有绑定的设备</div>
      <div style="font-size:12px;">点击下方按钮搜索附近的蓝牙设备</div>
    </div>`;
    return;
  }
  homeDevices.forEach((d, i) => {
    const card = document.createElement('div');
    card.className = 'device-card';
    card.innerHTML = `
      <div class="device-card-icon">${d.icon}</div>
      <div class="device-card-info">
        <div class="device-card-name">${d.name}</div>
        <div class="device-card-room">${d.id || '已绑定'}</div>
      </div>
      <div class="device-card-ctrl">
        <div class="switch on" data-idx="${i}"></div>
      </div>`;
    list.appendChild(card);
  });
  $$('.device-card-ctrl .switch').forEach(sw => {
    sw.addEventListener('click', () => sw.classList.toggle('on'));
  });
}

// 真实蓝牙设备搜索
async function scanBluetooth() {
  if (!navigator.bluetooth) {
    // 不支持蓝牙时，提示用户
    showModal(`<h3>📡 搜索设备</h3>
      <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">当前环境不支持蓝牙搜索。<br>在安卓 App 中可直接搜索附近设备。</p>
      <div id="scanResults" style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;"></div>
      <button class="btn-outline" id="simulateScan">模拟搜索附近设备</button>`);
    $('#simulateScan').onclick = simulateScan;
    return;
  }
  try {
    showModal(`<h3>📡 正在搜索蓝牙设备...</h3>
      <div style="text-align:center;padding:30px;">
        <div class="wake-orb" style="width:60px;height:60px;margin:0 auto;"></div>
        <div style="margin-top:16px;font-size:13px;color:var(--text-dim);">正在扫描附近设备，请稍候...</div>
      </div>`);
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['battery_service', 'device_information']
    });
    closeModal();
    const icon = guessDeviceIcon(device.name);
    homeDevices.push({
      name: device.name || '未知设备',
      icon,
      id: device.id.substring(0, 8),
      bound: true,
      device: device
    });
    renderDevices();
    toast(`已连接：${device.name || '未知设备'}`);
  } catch (err) {
    closeModal();
    toast('已取消搜索或搜索失败');
  }
}

// 无蓝牙时的模拟搜索（让界面可演示）
function simulateScan() {
  const results = $('#scanResults');
  results.innerHTML = '<div style="font-size:12px;color:var(--text-dim);">正在搜索...</div>';
  setTimeout(() => {
    const fakeDevices = [
      { name: '小米智能灯', id: 'MI-Light-001' },
      { name: '华为音箱', id: 'HW-Speaker-002' },
      { name: '飞利浦台灯', id: 'PHL-Lamp-003' },
    ];
    results.innerHTML = fakeDevices.map(d =>
      `<div class="menu-item" onclick="confirmSimDevice('${d.name}','${d.id}')">
        <div>
          <div class="menu-item-name">${d.name}</div>
          <div class="menu-item-desc">${d.id}</div>
        </div>
        <span style="font-size:11px;color:var(--accent);">连接</span>
      </div>`
    ).join('');
  }, 1200);
}

window.confirmSimDevice = function(name, id) {
  homeDevices.push({ name, icon: guessDeviceIcon(name), id, bound: true });
  closeModal();
  renderDevices();
  toast(`已绑定：${name}`);
};

function guessDeviceIcon(name) {
  if (/灯|light|lamp/i.test(name)) return '💡';
  if (/音箱|speaker|audio/i.test(name)) return '🎵';
  if (/空调|ac|air/i.test(name)) return '❄️';
  if (/锁|lock/i.test(name)) return '🔐';
  if (/窗帘|curtain/i.test(name)) return '🪟';
  return '📡';
}

renderDevices();

$('#addDeviceBtn').addEventListener('click', scanBluetooth);

// ---------- 手机控制 ----------
$$('[data-phone-act]').forEach(btn => {
  btn.addEventListener('click', () => {
    const act = btn.dataset.phoneAct;
    if (act === 'alarm') replies['闹钟']();
    else if (act === 'screen') {
      showModal(`<h3>📱 熄屏操控</h3>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">手机屏幕已关闭，AURA 仍可操控</p>
        <button class="btn-primary" onclick="toast('已唤醒手机')">点亮屏幕</button>`);
    }
    else if (act === 'post') {
      showModal(`<h3>📤 发布到抖音</h3>
        <p style="color:var(--text-dim);font-size:13px;margin-bottom:16px;">选择要发布的作品</p>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
          <div class="media-card" onclick="toast('正在发布到抖音...')"><div class="media-thumb grad-1"></div><div class="media-title">城市夜景</div></div>
          <div class="media-card" onclick="toast('正在发布到抖音...')"><div class="media-thumb grad-3"></div><div class="media-title">未来海报</div></div>
        </div>`);
    }
  });
});

// ---------- 创作：视频先选软件 ----------
$$('.create-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.create-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    $$('.create-panel').forEach(p => p.style.display = 'none');
    $('#panel-' + tab.dataset.create).style.display = 'block';
  });
});

let selectedSoftware = null;
$$('.sw-card').forEach(card => {
  card.addEventListener('click', () => {
    $$('.sw-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedSoftware = card.dataset.sw;
    $('#selectedSw').textContent = `已选择：${selectedSoftware}`;
    $('#videoAction').style.display = 'block';
  });
});

$('#genVideoBtn').addEventListener('click', () => {
  const prompt = $('#videoPrompt').value;
  if (!selectedSoftware) { toast('请先选择生成软件'); return; }
  if (!prompt.trim()) { toast('请输入视频描述'); return; }
  toast(`正在用 ${selectedSoftware} 生成视频...`);
  addMsg('ai', `🎬 正在使用「${selectedSoftware}」生成视频：${prompt}\n\n预计 1-2 分钟完成。`);
});

// 创作页风格芯片
$$('.create-panel .style-chips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chip.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
  });
});
