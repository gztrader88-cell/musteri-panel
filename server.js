const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Calisma saatleri
const MARKET_START = 9.5; // 09:30
const MARKET_END = 18;    // 18:00

// Tablolari olustur
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS musteriler (
        id SERIAL PRIMARY KEY,
        hesap_no VARCHAR(50) UNIQUE,
        isim VARCHAR(100),
        varlik DECIMAL(20,2),
        toplam_yuzde DECIMAL(10,2),
        bugun_kar DECIMAL(20,2),
        acik_pozisyon INT,
        kapali_pozisyon INT,
        buyukluk DECIMAL(20,2),
        bugun_yuzde DECIMAL(10,2),
        son_guncelleme TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS musteri_kayit (
        id SERIAL PRIMARY KEY,
        hesap_no VARCHAR(50) UNIQUE,
        baslangic_parasi DECIMAL(20,2),
        hakedis_miktari DECIMAL(20,2),
        komisyon_orani INT,
        para_birimi VARCHAR(10) DEFAULT 'TL',
        es_dost BOOLEAN DEFAULT FALSE,
        aktif BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    console.log('Tablolar hazir');
    
    const check = await pool.query('SELECT COUNT(*) FROM musteri_kayit');
    if (parseInt(check.rows[0].count) === 0) {
      await insertInitialCustomers();
    }
  } catch (err) {
    console.error('Tablo hatasi:', err.message);
  }
}

async function insertInitialCustomers() {
  const customers = [
    ['7197904', 38467, 38467, 30, 'USD', false],
    ['7197832', 530194, 530194, 25, 'TL', false],
    ['7198743', 1186432, 1186432, 25, 'TL', false],
    ['7189653', 651271, 651271, 25, 'TL', false],
    ['7195802', 273114, 273114, 25, 'TL', false],
    ['7196328', 362313, 362313, 25, 'TL', false],
    ['7197811', 281661, 281661, 25, 'TL', false],
    ['7203341', 1805322, 1805322, 20, 'TL', false],
    ['7211932', 292615, 292615, 25, 'TL', false],
    ['7220676', 1169620, 1169620, 20, 'TL', false],
    ['7220548', 1054661, 1054661, 25, 'TL', false],
    ['7220666', 506916, 506916, 25, 'TL', false],
    ['7220695', 374960, 374960, 25, 'TL', false],
    ['7220690', 347977, 347977, 25, 'TL', false],
    ['7222015', 509982, 509982, 20, 'TL', false],
    ['7230772', 1153093, 1153093, 20, 'TL', false],
    ['7221998', 380172, 380172, 25, 'TL', false],
    ['7227601', 484676, 484676, 25, 'TL', false],
    ['7227709', 395880, 395880, 25, 'TL', false],
    ['7231831', 695718, 695718, 25, 'TL', false],
    ['7231995', 447610, 447610, 25, 'TL', false],
    ['7232074', 435275, 435275, 25, 'TL', false],
    ['7229339', 333254, 333254, 25, 'TL', false],
    ['7231837', 527088, 527088, 25, 'TL', false],
    ['7232402', 784084, 784084, 25, 'TL', false],
    ['7234237', 270110, 270110, 25, 'TL', false],
    ['7149847', 300000, 300000, 25, 'TL', false],
    ['7235405', 500000, 500000, 25, 'TL', false],
    ['7235569', 250000, 250000, 25, 'TL', false],
    ['7236189', 150000, 150000, 25, 'TL', false],
    ['7236065', 350000, 350000, 25, 'TL', false],
    ['7152100', 400000, 400000, 25, 'TL', false],
    ['7192610', 350499, 350499, 25, 'TL', false],
    ['7236029', 250000, 250000, 25, 'TL', false],
    ['7236134', 327430, 327430, 25, 'TL', false],
    ['7236469', 250933, 250933, 25, 'TL', false],
    ['7231923', 850249, 850249, 25, 'TL', false],
    ['7237612', 273386, 273386, 25, 'TL', false],
    ['7237528', 601262, 601262, 25, 'TL', false],
    ['7237754', 990577, 990577, 20, 'TL', false],
    ['7237833', 250000, 250000, 25, 'TL', false],
    ['7237217', 250000, 250000, 25, 'TL', false],
    ['7237815', 288013, 288013, 25, 'TL', false],
    ['7237934', 271669, 271669, 25, 'TL', false],
    ['7238855', 450000, 450000, 25, 'TL', false],
    ['7238958', 250000, 250000, 25, 'TL', false],
    ['7236167', 250000, 250000, 25, 'TL', false],
    ['7239339', 274523, 274523, 25, 'TL', false],
    ['7239024', 294893, 294893, 25, 'TL', false],
    ['7236798', 279505, 279505, 25, 'TL', false],
    ['7235550', 271803, 271803, 25, 'TL', false],
    ['7240771', 1121442, 1121442, 20, 'TL', false],
    ['7240908', 250000, 250000, 25, 'TL', false],
    ['7195843', 290556, 290556, 25, 'TL', false],
    ['7241368', 398686, 398686, 25, 'TL', false],
    ['7241996', 287644, 287644, 25, 'TL', false],
    ['7237486', 303768, 303768, 25, 'TL', false],
    ['53618', 250000, 250000, 25, 'TL', false],
    ['7242011', 264377, 264377, 25, 'TL', false],
    ['7243614', 250000, 250000, 25, 'TL', false],
    ['7243582', 440000, 440000, 25, 'TL', false],
    ['7243488', 500000, 500000, 25, 'TL', false],
    ['7243619', 1000000, 1000000, 25, 'TL', false],
    ['7244161', 250000, 250000, 25, 'TL', false],
    ['7189496', 350000, 350000, 25, 'TL', false],
    ['99303048', 2000000, 2000000, 20, 'TL', false],
    ['7245343', 250000, 250000, 25, 'TL', false],
    ['7236080', 250000, 250000, 25, 'TL', false],
    ['7237690', 252000, 252000, 25, 'TL', false],
    ['7247038', 500000, 500000, 25, 'TL', false],
    ['7149714', 200000, 200000, 0, 'TL', true],
    ['7133687', 40000, 40000, 0, 'TL', true],
    ['7134170', 100000, 100000, 0, 'TL', true]
  ];
  
  for (const c of customers) {
    try {
      await pool.query(
        'INSERT INTO musteri_kayit (hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        c
      );
    } catch (e) { console.log('Insert error:', e.message); }
  }
  console.log('73 musteri eklendi');
}

initDB();

// Dolar kuru - webden cek
let cachedKur = { value: 43, timestamp: 0 };

async function getDolarKuru() {
  const now = Date.now();
  if (now - cachedKur.timestamp < 600000 && cachedKur.value) {
    return cachedKur.value;
  }
  
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    if (data && data.rates && data.rates.TRY) {
      cachedKur = { value: data.rates.TRY, timestamp: now };
      return cachedKur.value;
    }
  } catch (e) {}
  
  try {
    const response2 = await fetch('https://open.er-api.com/v6/latest/USD');
    const data2 = await response2.json();
    if (data2 && data2.rates && data2.rates.TRY) {
      cachedKur = { value: data2.rates.TRY, timestamp: now };
      return cachedKur.value;
    }
  } catch (e2) {}
  
  return cachedKur.value || 43;
}

function isMarketOpen() {
  const now = new Date();
  const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const day = turkeyTime.getDay();
  const hour = turkeyTime.getHours() + turkeyTime.getMinutes() / 60;
  if (day === 0 || day === 6) return false;
  return hour >= MARKET_START && hour < MARKET_END;
}

// API endpoints
app.post('/api/veri', async (req, res) => {
  try {
    const { hesap_no, isim, varlik, toplam_yuzde, bugun_kar, acik, kapali, buyukluk, bugun_yuzde } = req.body;
    await pool.query(`
      INSERT INTO musteriler (hesap_no, isim, varlik, toplam_yuzde, bugun_kar, acik_pozisyon, kapali_pozisyon, buyukluk, bugun_yuzde, son_guncelleme)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (hesap_no) DO UPDATE SET
        isim = $2, varlik = $3, toplam_yuzde = $4, bugun_kar = $5,
        acik_pozisyon = $6, kapali_pozisyon = $7, buyukluk = $8, bugun_yuzde = $9, son_guncelleme = NOW()
    `, [hesap_no, isim, varlik, toplam_yuzde, bugun_kar, acik, kapali, buyukluk, bugun_yuzde]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/musteriler', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, k.baslangic_parasi, k.hakedis_miktari, k.komisyon_orani, k.para_birimi, k.es_dost, k.aktif
      FROM musteriler m
      LEFT JOIN musteri_kayit k ON m.hesap_no = k.hesap_no
      ORDER BY m.varlik DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kayitli', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mk.*, m.isim, m.varlik, m.bugun_kar, m.bugun_yuzde, m.acik_pozisyon, m.son_guncelleme
      FROM musteri_kayit mk
      LEFT JOIN musteriler m ON mk.hesap_no = m.hesap_no
      ORDER BY mk.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kayit', async (req, res) => {
  try {
    const { hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost } = req.body;
    await pool.query(
      'INSERT INTO musteri_kayit (hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost) VALUES ($1,$2,$3,$4,$5,$6)',
      [hesap_no, baslangic_parasi, hakedis_miktari || baslangic_parasi, komisyon_orani, para_birimi || 'TL', es_dost || false]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/kayit/:hesap_no', async (req, res) => {
  try {
    const { hesap_no } = req.params;
    const { baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif } = req.body;
    await pool.query(
      'UPDATE musteri_kayit SET baslangic_parasi=$1, hakedis_miktari=$2, komisyon_orani=$3, para_birimi=$4, es_dost=$5, aktif=$6 WHERE hesap_no=$7',
      [baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif, hesap_no]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kur', async (req, res) => {
  const kur = await getDolarKuru();
  const marketOpen = isMarketOpen();
  res.json({ kur, marketOpen });
});

// Ana sayfa (dashboard)
app.get('/', (req, res) => {
  res.send(getMainPage());
});

// Musteriler sayfasi
app.get('/musteriler', (req, res) => {
  res.send(getCustomersPage());
});

function getMainPage() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Musteri Paneli</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;font-size:14px}
    .header{background:linear-gradient(135deg,#1a73e8,#0d47a1);color:#fff;padding:15px;text-align:center;position:relative}
    .header h1{font-size:1.2rem}
    .market-status{font-size:0.7rem;margin-top:5px;opacity:0.9}
    .market-open{color:#90EE90}
    .market-closed{color:#ffcccb}
    .header-btns{position:absolute;right:15px;top:50%;transform:translateY(-50%);display:flex;gap:6px}
    .header-btn{background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:0.75rem;text-decoration:none;display:inline-block}
    .header-btn:hover{background:rgba(255,255,255,0.3)}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;padding:10px}
    .stat-card{background:#fff;padding:10px;border-radius:8px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
    .stat-value{font-size:1rem;font-weight:bold;color:#1a73e8}
    .stat-label{font-size:0.65rem;color:#666;margin-top:2px}
    .alerts{padding:8px 10px;display:flex;gap:6px;flex-wrap:wrap}
    .alert-btn{padding:6px 10px;border-radius:15px;border:none;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;gap:4px}
    .alert-btn.warning{background:#fef3c7;color:#92400e}
    .alert-btn.danger{background:#fee2e2;color:#991b1b}
    .alert-btn.success{background:#d1fae5;color:#065f46}
    .alert-btn.info{background:#e0f2fe;color:#0369a1}
    .container{padding:10px}
    .table-wrapper{background:#fff;border-radius:8px;overflow-x:auto;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
    table{width:100%;border-collapse:collapse;font-size:0.75rem}
    th{background:#f8f9fa;padding:8px 6px;text-align:left;font-weight:600;color:#555;border-bottom:2px solid #e5e7eb;white-space:nowrap}
    td{padding:6px;border-bottom:1px solid #f0f0f0;white-space:nowrap}
    tr:hover{background:#f8fafc}
    .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
    .status-online{background:#22c55e}
    .status-offline{background:#ef4444}
    .status-neutral{background:#9ca3af}
    .positive{color:#0d9488}
    .negative{color:#dc2626}
    .highlight{background:#fef3c7!important}
    .es-dost{background:#e0f2fe!important}
    .refresh-btn{position:fixed;bottom:15px;right:15px;background:#1a73e8;color:#fff;border:none;width:45px;height:45px;border-radius:50%;font-size:1.2rem;cursor:pointer;box-shadow:0 4px 15px rgba(26,115,232,0.4)}
    .last-update{text-align:center;padding:6px;font-size:0.65rem;color:#888}
    .modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:100;align-items:center;justify-content:center}
    .modal.show{display:flex}
    .modal-content{background:#fff;padding:20px;border-radius:12px;max-width:95%;max-height:85%;overflow:auto;width:400px}
    .modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:15px}
    .modal-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:#666}
    .modal-list{list-style:none}
    .modal-list li{padding:8px 0;border-bottom:1px solid #eee;font-size:0.85rem}
    .form-group{margin-bottom:12px}
    .form-group label{display:block;margin-bottom:4px;font-size:0.8rem;color:#555}
    .form-group input,.form-group select{width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:0.85rem}
    .form-btn{width:100%;padding:10px;background:#1a73e8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem}
    .form-btn:hover{background:#1557b0}
    .tabs{display:flex;gap:10px;margin-bottom:15px}
    .tab{padding:8px 15px;border:none;background:#eee;border-radius:6px;cursor:pointer}
    .tab.active{background:#1a73e8;color:#fff}
  </style>
</head>
<body>
  <div class="header">
    <h1>Musteri Takip Paneli</h1>
    <div class="market-status" id="marketStatus">Piyasa durumu yukleniyor...</div>
    <div class="header-btns">
      <a href="/musteriler" class="header-btn">👥 Musteriler</a>
      <button class="header-btn" onclick="showSettings()">⚙️</button>
    </div>
  </div>
  
  <div class="stats">
    <div class="stat-card">
      <div class="stat-value" id="totalCustomers">-</div>
      <div class="stat-label">Musteri</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="activeCustomers">-</div>
      <div class="stat-label">Aktif</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="totalBalance">-</div>
      <div class="stat-label">Toplam Varlik</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="todayProfit">-</div>
      <div class="stat-label">Bugun Kar</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="avgPct">-</div>
      <div class="stat-label">Ort %</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="komisyon">-</div>
      <div class="stat-label">Komisyon</div>
    </div>
  </div>
  
  <div class="alerts" id="alerts"></div>
  <div class="last-update">Son: <span id="lastUpdate">-</span> | Kur: <span id="kurInfo">-</span></div>
  
  <div class="container">
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Isim</th>
            <th>Varlik</th>
            <th>Bugun</th>
            <th>%</th>
            <th>Acik</th>
            <th>Kmsy</th>
          </tr>
        </thead>
        <tbody id="customerTable">
          <tr><td colspan="7" style="text-align:center;padding:30px">Yukleniyor...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
  
  <button class="refresh-btn" onclick="loadData()">↻</button>
  
  <div class="modal" id="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalTitle">Uyari</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <ul class="modal-list" id="modalList"></ul>
    </div>
  </div>
  
  <div class="modal" id="settingsModal">
    <div class="modal-content" style="width:350px">
      <div class="modal-header">
        <h3>Ayarlar</h3>
        <button class="modal-close" onclick="closeSettings()">×</button>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="showTab('add', event)">Yeni Ekle</button>
        <button class="tab" onclick="showTab('list', event)">Liste</button>
      </div>
      <div id="tabAdd">
        <div class="form-group">
          <label>Hesap No (ID)</label>
          <input type="text" id="newHesapNo" placeholder="7123456">
        </div>
        <div class="form-group">
          <label>Baslangic Parasi</label>
          <input type="number" id="newBaslangic" placeholder="250000">
        </div>
        <div class="form-group">
          <label>Hakedis Miktari</label>
          <input type="number" id="newHakedis" placeholder="Bos ise baslangic kullanilir">
        </div>
        <div class="form-group">
          <label>Komisyon Orani (%)</label>
          <select id="newKomisyon">
            <option value="25">%25</option>
            <option value="20">%20</option>
            <option value="30">%30</option>
            <option value="0">%0</option>
          </select>
        </div>
        <div class="form-group">
          <label>Para Birimi</label>
          <select id="newParaBirimi">
            <option value="TL">TL</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div class="form-group">
          <label><input type="checkbox" id="newEsDost"> Es-Dost (Komisyonsuz)</label>
        </div>
        <button class="form-btn" onclick="addCustomer()">Ekle</button>
      </div>
      <div id="tabList" style="display:none;max-height:300px;overflow:auto">
        <div id="customerListSettings"></div>
      </div>
    </div>
  </div>
  
  <script>
    let allData = [];
    let kayitliData = [];
    let DOLAR_KURU = 43;
    let MARKET_OPEN = true;
    
    function formatMoney(n) {
      if (n === null || n === undefined || isNaN(n)) return '0';
      return new Intl.NumberFormat('tr-TR').format(Math.round(n));
    }
    
    function isActive(lastUpdate) {
      if (!MARKET_OPEN) return true;
      if (!lastUpdate) return false;
      const diff = (new Date() - new Date(lastUpdate)) / 1000 / 60;
      return diff < 65;
    }
    
    function getMajorityPosition(data) {
      const counts = {};
      data.forEach(c => { const p = c.acik_pozisyon || 0; counts[p] = (counts[p] || 0) + 1; });
      let max = 0, maj = 0;
      for (const [p, cnt] of Object.entries(counts)) { if (cnt > max) { max = cnt; maj = parseInt(p); } }
      return maj;
    }
    
    function getStdDev(data) {
      const vals = data.map(c => parseFloat(c.bugun_yuzde) || 0);
      if (vals.length === 0) return { mean: 0, stdDev: 0 };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sqDiffs = vals.map(v => Math.pow(v - mean, 2));
      return { mean, stdDev: Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / vals.length) };
    }
    
    function calcKomisyon(c) {
      if (!c.hakedis_miktari || c.es_dost) return 0;
      const varlik = parseFloat(c.varlik) || 0;
      const hakedis = parseFloat(c.hakedis_miktari) || 0;
      const oran = (parseFloat(c.komisyon_orani) || 0) / 100;
      if (c.para_birimi === 'USD') {
        const varlikUSD = varlik / DOLAR_KURU;
        const fark = varlikUSD - hakedis;
        return fark * oran * DOLAR_KURU;
      }
      return (varlik - hakedis) * oran;
    }
    
    function showModal(title, items) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalList').innerHTML = items.map(i => '<li>' + i + '</li>').join('');
      document.getElementById('modal').classList.add('show');
    }
    function closeModal() { document.getElementById('modal').classList.remove('show'); }
    function showSettings() { document.getElementById('settingsModal').classList.add('show'); loadKayitli(); }
    function closeSettings() { document.getElementById('settingsModal').classList.remove('show'); }
    
    function showTab(tab, event) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      if (event && event.target) event.target.classList.add('active');
      document.getElementById('tabAdd').style.display = tab === 'add' ? 'block' : 'none';
      document.getElementById('tabList').style.display = tab === 'list' ? 'block' : 'none';
      if (tab === 'list') loadKayitli();
    }
    
    async function loadKayitli() {
      const res = await fetch('/api/kayitli');
      kayitliData = await res.json();
      document.getElementById('customerListSettings').innerHTML = kayitliData.map(k => 
        '<div style="padding:8px;border-bottom:1px solid #eee;font-size:0.8rem">' +
        '<strong>#' + k.hesap_no + '</strong> - ' + (k.es_dost ? 'Es-Dost' : '%' + k.komisyon_orani + ' ' + k.para_birimi) +
        '<br><small>Hakedis: ' + formatMoney(k.hakedis_miktari) + (k.para_birimi === 'USD' ? ' USD' : ' TL') + '</small>' +
        '</div>'
      ).join('');
    }
    
    async function addCustomer() {
      const data = {
        hesap_no: document.getElementById('newHesapNo').value,
        baslangic_parasi: document.getElementById('newBaslangic').value,
        hakedis_miktari: document.getElementById('newHakedis').value || document.getElementById('newBaslangic').value,
        komisyon_orani: document.getElementById('newKomisyon').value,
        para_birimi: document.getElementById('newParaBirimi').value,
        es_dost: document.getElementById('newEsDost').checked
      };
      if (!data.hesap_no || !data.baslangic_parasi) { alert('Hesap No ve Baslangic Parasi zorunlu'); return; }
      const res = await fetch('/api/kayit', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) });
      if (res.ok) { alert('Eklendi!'); closeSettings(); loadData(); }
      else alert('Hata!');
    }
    
    async function loadData() {
      try {
        const [dataRes, kurRes, kayitliRes] = await Promise.all([
          fetch('/api/musteriler'), 
          fetch('/api/kur'),
          fetch('/api/kayitli')
        ]);
        allData = await dataRes.json();
        const kurData = await kurRes.json();
        kayitliData = await kayitliRes.json();
        
        DOLAR_KURU = kurData.kur || 43;
        MARKET_OPEN = kurData.marketOpen;
        
        const marketStatusEl = document.getElementById('marketStatus');
        if (MARKET_OPEN) {
          marketStatusEl.innerHTML = '<span class="market-open">● Piyasa Acik</span> | $1 = ' + DOLAR_KURU.toFixed(2) + ' TL';
        } else {
          marketStatusEl.innerHTML = '<span class="market-closed">● Piyasa Kapali</span> | $1 = ' + DOLAR_KURU.toFixed(2) + ' TL';
        }
        
        const kayitliIDs = kayitliData.map(k => k.hesap_no);
        const activeCount = allData.filter(c => isActive(c.son_guncelleme)).length;
        const totalBalance = allData.reduce((s, c) => s + (parseFloat(c.varlik) || 0), 0);
        const todayProfit = allData.reduce((s, c) => s + (parseFloat(c.bugun_kar) || 0), 0);
        const avgPct = allData.length > 0 ? allData.reduce((s, c) => s + (parseFloat(c.bugun_yuzde) || 0), 0) / allData.length : 0;
        const totalKomisyon = allData.reduce((s, c) => s + calcKomisyon(c), 0);
        
        document.getElementById('totalCustomers').textContent = allData.length + '/' + kayitliData.filter(k=>k.aktif!==false).length;
        document.getElementById('activeCustomers').textContent = MARKET_OPEN ? activeCount : '-';
        document.getElementById('totalBalance').textContent = formatMoney(totalBalance);
        document.getElementById('todayProfit').textContent = (todayProfit >= 0 ? '+' : '') + formatMoney(todayProfit);
        document.getElementById('todayProfit').className = 'stat-value ' + (todayProfit >= 0 ? 'positive' : 'negative');
        document.getElementById('avgPct').textContent = (avgPct >= 0 ? '+' : '') + avgPct.toFixed(2) + '%';
        document.getElementById('avgPct').className = 'stat-value ' + (avgPct >= 0 ? 'positive' : 'negative');
        document.getElementById('komisyon').textContent = (totalKomisyon >= 0 ? '+' : '') + formatMoney(totalKomisyon);
        document.getElementById('komisyon').className = 'stat-value ' + (totalKomisyon >= 0 ? 'positive' : 'negative');
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('tr-TR');
        document.getElementById('kurInfo').textContent = '$1 = ' + DOLAR_KURU.toFixed(2) + ' TL';
        
        const majPos = getMajorityPosition(allData);
        const posIssues = allData.filter(c => (c.acik_pozisyon || 0) !== majPos);
        const { mean, stdDev } = getStdDev(allData);
        const outliers = allData.filter(c => Math.abs((parseFloat(c.bugun_yuzde) || 0) - mean) > stdDev * 2);
        const gelenIDs = allData.map(m => m.hesap_no);
        const gelmeyenler = kayitliData.filter(k => k.aktif !== false && !gelenIDs.includes(k.hesap_no));
        
        let alertsHtml = '';
        if (MARKET_OPEN) {
          const inactiveList = allData.filter(c => !isActive(c.son_guncelleme));
          if (gelmeyenler.length > 0) alertsHtml += '<button class="alert-btn danger" onclick="showGelmeyenler()">🚨 Veri Yok: ' + gelmeyenler.length + '</button>';
          if (inactiveList.length > 0) alertsHtml += '<button class="alert-btn danger" onclick="showInactive()">⚠ Pasif: ' + inactiveList.length + '</button>';
          if (posIssues.length > 0) alertsHtml += '<button class="alert-btn warning" onclick="showPosIssues()">📊 Poz: ' + posIssues.length + '</button>';
          if (outliers.length > 0) alertsHtml += '<button class="alert-btn warning" onclick="showOutliers()">📈 Sapma: ' + outliers.length + '</button>';
          if (alertsHtml === '') alertsHtml = '<button class="alert-btn success">✓ Normal</button>';
        } else {
          alertsHtml = '<button class="alert-btn info">🌙 Piyasa Kapali - Kontrol Pasif</button>';
          if (posIssues.length > 0) alertsHtml += '<button class="alert-btn warning" onclick="showPosIssues()">📊 Poz: ' + posIssues.length + '</button>';
          if (outliers.length > 0) alertsHtml += '<button class="alert-btn warning" onclick="showOutliers()">📈 Sapma: ' + outliers.length + '</button>';
        }
        document.getElementById('alerts').innerHTML = alertsHtml;
        
        const tbody = document.getElementById('customerTable');
        if (allData.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px">Veri bekleniyor...</td></tr>'; return; }
        
        tbody.innerHTML = allData.map(c => {
          const active = isActive(c.son_guncelleme);
          const bugunKar = parseFloat(c.bugun_kar) || 0;
          const bugunPct = parseFloat(c.bugun_yuzde) || 0;
          const posIssue = (c.acik_pozisyon || 0) !== majPos;
          const isOutlier = Math.abs(bugunPct - mean) > stdDev * 2;
          const komisyon = calcKomisyon(c);
          let rowClass = '';
          if (c.es_dost) rowClass = 'es-dost';
          else if (posIssue || isOutlier) rowClass = 'highlight';
          let statusClass = 'status-online';
          if (!MARKET_OPEN) statusClass = 'status-neutral';
          else if (!active) statusClass = 'status-offline';
          
          return '<tr class="' + rowClass + '">' +
            '<td><span class="status-dot ' + statusClass + '"></span></td>' +
            '<td>' + (c.isim || '-') + '<br><small style="color:#888">#' + c.hesap_no + '</small></td>' +
            '<td>' + formatMoney(c.varlik) + '</td>' +
            '<td class="' + (bugunKar >= 0 ? 'positive' : 'negative') + '">' + (bugunKar >= 0 ? '+' : '') + formatMoney(bugunKar) + '</td>' +
            '<td class="' + (bugunPct >= 0 ? 'positive' : 'negative') + '">' + (bugunPct >= 0 ? '+' : '') + bugunPct.toFixed(1) + '%</td>' +
            '<td>' + (c.acik_pozisyon || 0) + '</td>' +
            '<td class="' + (komisyon >= 0 ? 'positive' : 'negative') + '">' + (c.es_dost ? '-' : formatMoney(komisyon)) + '</td>' +
          '</tr>';
        }).join('');
      } catch (err) { console.error(err); }
    }
    
    function showInactive() {
      const list = allData.filter(c => !isActive(c.son_guncelleme)).map(c => (c.isim||'-') + ' (#' + c.hesap_no + ')');
      showModal('Pasif (65+ dk)', list);
    }
    function showPosIssues() {
      const maj = getMajorityPosition(allData);
      const list = allData.filter(c => (c.acik_pozisyon || 0) !== maj).map(c => (c.isim||'-') + ' - Acik: ' + (c.acik_pozisyon||0) + ' (gereken: ' + maj + ')');
      showModal('Pozisyon Farki', list);
    }
    function showOutliers() {
      const { mean } = getStdDev(allData);
      const list = allData.filter(c => Math.abs((parseFloat(c.bugun_yuzde)||0) - mean) > getStdDev(allData).stdDev * 2)
        .map(c => (c.isim||'-') + ' - ' + (parseFloat(c.bugun_yuzde)||0).toFixed(2) + '% (ort: ' + mean.toFixed(2) + '%)');
      showModal('Kar Sapmasi', list);
    }
    function showGelmeyenler() {
      const gelenIDs = allData.map(m => m.hesap_no);
      const list = kayitliData.filter(k => k.aktif !== false && !gelenIDs.includes(k.hesap_no)).map(k => '#' + k.hesap_no);
      showModal('Veri Gelmeyen Musteriler', list);
    }
    
    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>`;
}

function getCustomersPage() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Musteriler</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;font-size:14px}
    .header{background:linear-gradient(135deg,#1a73e8,#0d47a1);color:#fff;padding:15px;display:flex;align-items:center;gap:15px}
    .back-btn{background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer;text-decoration:none;font-size:0.85rem}
    .back-btn:hover{background:rgba(255,255,255,0.3)}
    .header h1{font-size:1.2rem;flex:1;text-align:center}
    .search-bar{padding:10px;background:#fff;border-bottom:1px solid #eee}
    .search-bar input{width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:20px;font-size:0.85rem;outline:none}
    .search-bar input:focus{border-color:#1a73e8}
    .customer-grid{padding:10px;display:grid;gap:8px}
    .customer-card{background:#fff;border-radius:10px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,0.1);cursor:pointer;transition:all 0.15s;border-left:4px solid #e5e7eb}
    .customer-card:hover{box-shadow:0 3px 12px rgba(0,0,0,0.15);transform:translateY(-1px)}
    .customer-card.active{border-left-color:#22c55e}
    .customer-card.inactive{border-left-color:#ef4444}
    .customer-card.neutral{border-left-color:#9ca3af}
    .customer-card.es-dost{background:#f0f9ff;border-left-color:#0ea5e9}
    .card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
    .card-name{font-weight:600;font-size:0.9rem;color:#1e293b}
    .card-id{font-size:0.7rem;color:#94a3b8;margin-top:2px}
    .card-badge{font-size:0.65rem;padding:2px 8px;border-radius:10px;background:#f1f5f9;color:#64748b}
    .card-badge.es-dost-badge{background:#e0f2fe;color:#0369a1}
    .card-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px}
    .card-stat{text-align:center;background:#f8fafc;border-radius:6px;padding:5px}
    .card-stat-value{font-size:0.8rem;font-weight:600}
    .card-stat-label{font-size:0.6rem;color:#94a3b8;margin-top:1px}
    .card-footer{margin-top:8px;display:flex;justify-content:space-between;align-items:center;font-size:0.7rem;color:#94a3b8}
    .positive{color:#0d9488}
    .negative{color:#dc2626}
    .filter-bar{padding:8px 10px;display:flex;gap:6px;overflow-x:auto;background:#fff;border-bottom:1px solid #eee}
    .filter-btn{padding:5px 12px;border-radius:15px;border:1px solid #ddd;font-size:0.7rem;cursor:pointer;white-space:nowrap;background:#fff}
    .filter-btn.active{background:#1a73e8;color:#fff;border-color:#1a73e8}
    .count-badge{display:inline-block;background:#1a73e8;color:#fff;border-radius:10px;padding:1px 6px;font-size:0.65rem;margin-left:4px}
    
    .modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:200;align-items:flex-end;justify-content:center}
    .modal.show{display:flex}
    .modal-sheet{background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:500px;max-height:92vh;overflow:auto;padding:20px;animation:slideUp 0.2s ease}
    @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
    .modal-handle{width:40px;height:4px;background:#e2e8f0;border-radius:2px;margin:0 auto 16px}
    .modal-title{font-size:1.1rem;font-weight:700;color:#1e293b;margin-bottom:4px}
    .modal-subtitle{font-size:0.75rem;color:#94a3b8;margin-bottom:18px}
    .section-title{font-size:0.7rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;margin-top:16px}
    .info-row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:0.85rem}
    .info-label{color:#64748b}
    .info-value{font-weight:500;color:#1e293b}
    .form-group{margin-bottom:12px}
    .form-group label{display:block;margin-bottom:4px;font-size:0.78rem;color:#64748b;font-weight:500}
    .form-group input,.form-group select{width:100%;padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:0.85rem;outline:none;transition:border-color 0.15s}
    .form-group input:focus,.form-group select:focus{border-color:#1a73e8}
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .checkbox-group{display:flex;align-items:center;gap:8px;padding:10px 0}
    .checkbox-group input[type=checkbox]{width:18px;height:18px;cursor:pointer}
    .checkbox-group label{font-size:0.85rem;color:#374151;cursor:pointer;font-weight:500}
    .btn-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
    .btn{padding:12px;border:none;border-radius:10px;cursor:pointer;font-size:0.9rem;font-weight:600}
    .btn-primary{background:#1a73e8;color:#fff}
    .btn-primary:hover{background:#1557b0}
    .btn-secondary{background:#f1f5f9;color:#374151}
    .btn-secondary:hover{background:#e2e8f0}
    .hakedis-hint{font-size:0.72rem;color:#1a73e8;margin-top:4px;background:#eff6ff;padding:6px 8px;border-radius:6px}
    .no-data{text-align:center;padding:40px 20px;color:#94a3b8}
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="back-btn">← Geri</a>
    <h1>Musteriler</h1>
    <div style="width:60px"></div>
  </div>

  <div class="search-bar">
    <input type="text" id="searchInput" placeholder="Isim veya hesap no ara..." oninput="filterCustomers()">
  </div>

  <div class="filter-bar">
    <button class="filter-btn active" onclick="setFilter('all', this)">Tumu <span class="count-badge" id="countAll">0</span></button>
    <button class="filter-btn" onclick="setFilter('active', this)">Aktif <span class="count-badge" id="countActive">0</span></button>
    <button class="filter-btn" onclick="setFilter('inactive', this)">Pasif <span class="count-badge" id="countInactive">0</span></button>
    <button class="filter-btn" onclick="setFilter('esdost', this)">Es-Dost <span class="count-badge" id="countEsDost">0</span></button>
    <button class="filter-btn" onclick="setFilter('kayitsiz', this)">Kayitsiz <span class="count-badge" id="countKayitsiz">0</span></button>
  </div>

  <div class="customer-grid" id="customerGrid">
    <div class="no-data">Yukleniyor...</div>
  </div>

  <div class="modal" id="editModal" onclick="handleModalBackdrop(event)">
    <div class="modal-sheet" id="editSheet">
      <div class="modal-handle"></div>
      <div class="modal-title" id="editTitle">Musteri Duzenle</div>
      <div class="modal-subtitle" id="editSubtitle"></div>

      <div class="section-title">📊 Canli Veriler (MQL)</div>
      <div class="info-row">
        <span class="info-label">Son Varlik</span>
        <span class="info-value" id="infoVarlik">-</span>
      </div>
      <div class="info-row">
        <span class="info-label">Bugun Kar/Zarar</span>
        <span class="info-value" id="infoBugunKar">-</span>
      </div>
      <div class="info-row">
        <span class="info-label">Bugun %</span>
        <span class="info-value" id="infoBugunPct">-</span>
      </div>
      <div class="info-row">
        <span class="info-label">Acik Pozisyon</span>
        <span class="info-value" id="infoAcikPoz">-</span>
      </div>
      <div class="info-row">
        <span class="info-label">Son Guncelleme</span>
        <span class="info-value" id="infoSonGun">-</span>
      </div>

      <div class="section-title">✏️ Kayit Bilgileri (Duzenlenebilir)</div>
      
      <input type="hidden" id="editHesapNo">

      <div class="form-row">
        <div class="form-group">
          <label>Baslangic Parasi</label>
          <input type="number" id="editBaslangic" placeholder="250000">
        </div>
        <div class="form-group">
          <label>Para Birimi</label>
          <select id="editParaBirimi">
            <option value="TL">TL</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Hakedis Miktari</label>
        <input type="number" id="editHakedis" placeholder="0">
        <div class="hakedis-hint" id="hakedisHint">💡 Para cekimi sonrasi baslangic parasini dusurerek guncelleyin. Komisyon bu deger uzerinden hesaplanir.</div>
      </div>

      <div class="form-group">
        <label>Komisyon Orani (%)</label>
        <select id="editKomisyon">
          <option value="30">%30</option>
          <option value="25">%25</option>
          <option value="20">%20</option>
          <option value="15">%15</option>
          <option value="0">%0 (Komisyonsuz)</option>
        </select>
      </div>

      <div class="checkbox-group">
        <input type="checkbox" id="editEsDost">
        <label for="editEsDost">Es-Dost (Komisyon hesaplanmaz)</label>
      </div>
      <div class="checkbox-group">
        <input type="checkbox" id="editAktif">
        <label for="editAktif">Aktif musteri</label>
      </div>

      <div id="komisyonBilgi" style="margin-top:12px;padding:10px;background:#f0fdf4;border-radius:8px;font-size:0.8rem;color:#166534"></div>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="closeEditModal()">Iptal</button>
        <button class="btn btn-primary" onclick="saveCustomer()">💾 Kaydet</button>
      </div>
    </div>
  </div>

  <script>
    let allCustomers = [];
    let kayitliCustomers = [];
    let currentFilter = 'all';
    let DOLAR_KURU = 43;
    let MARKET_OPEN = true;

    function formatMoney(n) {
      if (n === null || n === undefined || isNaN(n)) return '0';
      return new Intl.NumberFormat('tr-TR').format(Math.round(n));
    }

    function isActive(lastUpdate) {
      if (!MARKET_OPEN) return null;
      if (!lastUpdate) return false;
      const diff = (new Date() - new Date(lastUpdate)) / 1000 / 60;
      return diff < 65;
    }

    function calcKomisyon(c) {
      if (!c.hakedis_miktari || c.es_dost) return 0;
      const varlik = parseFloat(c.varlik) || 0;
      const hakedis = parseFloat(c.hakedis_miktari) || 0;
      const oran = (parseFloat(c.komisyon_orani) || 0) / 100;
      if (c.para_birimi === 'USD') {
        const varlikUSD = varlik / DOLAR_KURU;
        return (varlikUSD - hakedis) * oran * DOLAR_KURU;
      }
      return (varlik - hakedis) * oran;
    }

    function setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderCards();
    }

    function filterCustomers() { renderCards(); }

    function getFilteredData() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      
      if (currentFilter === 'kayitsiz') {
        const gelenlIDs = allCustomers.map(c => c.hesap_no);
        const kayitsizlar = kayitliCustomers.filter(k => !gelenlIDs.includes(k.hesap_no));
        return kayitsizlar.filter(k => !search || k.hesap_no.toLowerCase().includes(search));
      }

      let data = [...allCustomers];
      if (currentFilter === 'active') data = data.filter(c => isActive(c.son_guncelleme) === true);
      else if (currentFilter === 'inactive') data = data.filter(c => isActive(c.son_guncelleme) === false);
      else if (currentFilter === 'esdost') data = data.filter(c => c.es_dost);

      if (search) {
        data = data.filter(c => 
          (c.isim || '').toLowerCase().includes(search) ||
          c.hesap_no.toLowerCase().includes(search)
        );
      }
      return data;
    }

    function updateCounts() {
      const gelenlIDs = allCustomers.map(c => c.hesap_no);
      document.getElementById('countAll').textContent = allCustomers.length;
      document.getElementById('countActive').textContent = allCustomers.filter(c => isActive(c.son_guncelleme) === true).length;
      document.getElementById('countInactive').textContent = allCustomers.filter(c => isActive(c.son_guncelleme) === false).length;
      document.getElementById('countEsDost').textContent = allCustomers.filter(c => c.es_dost).length;
      document.getElementById('countKayitsiz').textContent = kayitliCustomers.filter(k => !gelenlIDs.includes(k.hesap_no)).length;
    }

    function renderCards() {
      const data = getFilteredData();
      const grid = document.getElementById('customerGrid');
      
      if (data.length === 0) {
        grid.innerHTML = '<div class="no-data">Musteri bulunamadi</div>';
        return;
      }

      grid.innerHTML = data.map(c => {
        const active = isActive(c.son_guncelleme);
        const bugunKar = parseFloat(c.bugun_kar) || 0;
        const bugunPct = parseFloat(c.bugun_yuzde) || 0;
        const komisyon = calcKomisyon(c);
        
        let cardClass = 'customer-card';
        let statusText = '';
        if (c.es_dost) { cardClass += ' es-dost'; statusText = 'Es-Dost'; }
        else if (active === true) { cardClass += ' active'; statusText = 'Aktif'; }
        else if (active === false) { cardClass += ' inactive'; statusText = 'Pasif'; }
        else { cardClass += ' neutral'; statusText = 'Piyasa Kapali'; }

        if (!c.varlik && c.baslangic_parasi) {
          return '<div class="' + cardClass + '" onclick="openEditModal(' + JSON.stringify(c).replace(/"/g, '&quot;') + ')">' +
            '<div class="card-header">' +
              '<div><div class="card-name">#' + c.hesap_no + '</div><div class="card-id">Canli veri bekleniyor</div></div>' +
              '<span class="card-badge">Kayitli</span>' +
            '</div>' +
            '<div class="info-row" style="font-size:0.8rem;padding:4px 0">' +
              '<span style="color:#64748b">Baslangic</span><span>' + formatMoney(c.baslangic_parasi) + ' ' + (c.para_birimi||'TL') + '</span>' +
            '</div>' +
          '</div>';
        }

        return '<div class="' + cardClass + '" onclick="openEditModal(' + JSON.stringify(c).replace(/"/g, '&quot;') + ')">' +
          '<div class="card-header">' +
            '<div>' +
              '<div class="card-name">' + (c.isim || '#' + c.hesap_no) + '</div>' +
              '<div class="card-id">#' + c.hesap_no + ' · ' + (c.para_birimi || 'TL') + '</div>' +
            '</div>' +
            '<span class="card-badge' + (c.es_dost ? ' es-dost-badge' : '') + '">' + statusText + '</span>' +
          '</div>' +
          '<div class="card-stats">' +
            '<div class="card-stat"><div class="card-stat-value">' + formatMoney(c.varlik) + '</div><div class="card-stat-label">Varlik</div></div>' +
            '<div class="card-stat"><div class="card-stat-value ' + (bugunKar >= 0 ? 'positive' : 'negative') + '">' + (bugunKar >= 0 ? '+' : '') + formatMoney(bugunKar) + '</div><div class="card-stat-label">Bugun</div></div>' +
            '<div class="card-stat"><div class="card-stat-value ' + (komisyon >= 0 ? 'positive' : 'negative') + '">' + (c.es_dost ? '-' : formatMoney(komisyon)) + '</div><div class="card-stat-label">Komisyon</div></div>' +
          '</div>' +
          '<div class="card-footer">' +
            '<span>Hakedis: ' + formatMoney(c.hakedis_miktari) + ' ' + (c.para_birimi||'TL') + '</span>' +
            '<span>%' + bugunPct.toFixed(2) + ' bugun</span>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function openEditModal(c) {
      document.getElementById('editHesapNo').value = c.hesap_no;
      document.getElementById('editTitle').textContent = c.isim || ('#' + c.hesap_no);
      document.getElementById('editSubtitle').textContent = 'Hesap No: ' + c.hesap_no;
      
      const bugunKar = parseFloat(c.bugun_kar) || 0;
      const bugunPct = parseFloat(c.bugun_yuzde) || 0;
      document.getElementById('infoVarlik').textContent = c.varlik ? formatMoney(c.varlik) + ' ' + (c.para_birimi||'TL') : 'Veri yok';
      document.getElementById('infoBugunKar').innerHTML = c.bugun_kar !== undefined ? 
        '<span class="' + (bugunKar>=0?'positive':'negative') + '">' + (bugunKar>=0?'+':'') + formatMoney(bugunKar) + '</span>' : '-';
      document.getElementById('infoBugunPct').innerHTML = c.bugun_yuzde !== undefined ?
        '<span class="' + (bugunPct>=0?'positive':'negative') + '">' + (bugunPct>=0?'+':'') + bugunPct.toFixed(2) + '%</span>' : '-';
      document.getElementById('infoAcikPoz').textContent = c.acik_pozisyon !== undefined ? c.acik_pozisyon : '-';
      document.getElementById('infoSonGun').textContent = c.son_guncelleme ? 
        new Date(c.son_guncelleme).toLocaleString('tr-TR') : 'Veri gelmedi';

      document.getElementById('editBaslangic').value = c.baslangic_parasi || '';
      document.getElementById('editHakedis').value = c.hakedis_miktari || '';
      document.getElementById('editKomisyon').value = c.komisyon_orani || 25;
      document.getElementById('editParaBirimi').value = c.para_birimi || 'TL';
      document.getElementById('editEsDost').checked = !!c.es_dost;
      document.getElementById('editAktif').checked = c.aktif !== false;

      updateKomisyonBilgi(c);

      document.getElementById('editHakedis').oninput = function() {
        const temp = {...c, hakedis_miktari: this.value, komisyon_orani: document.getElementById('editKomisyon').value, para_birimi: document.getElementById('editParaBirimi').value};
        updateKomisyonBilgi(temp);
      };
      document.getElementById('editKomisyon').onchange = function() {
        const temp = {...c, hakedis_miktari: document.getElementById('editHakedis').value, komisyon_orani: this.value, para_birimi: document.getElementById('editParaBirimi').value};
        updateKomisyonBilgi(temp);
      };

      document.getElementById('editModal').classList.add('show');
    }

    function updateKomisyonBilgi(c) {
      const esDost = document.getElementById('editEsDost') ? document.getElementById('editEsDost').checked : c.es_dost;
      if (esDost) { document.getElementById('komisyonBilgi').textContent = ''; return; }
      const varlik = parseFloat(c.varlik) || 0;
      const hakedis = parseFloat(c.hakedis_miktari) || 0;
      const oran = (parseFloat(c.komisyon_orani) || 0) / 100;
      let komisyon = 0, fark = 0;
      if (c.para_birimi === 'USD') {
        const varlikUSD = varlik / DOLAR_KURU;
        fark = varlikUSD - hakedis;
        komisyon = fark * oran * DOLAR_KURU;
      } else {
        fark = varlik - hakedis;
        komisyon = fark * oran;
      }
      if (varlik > 0) {
        const sign = fark >= 0 ? '+' : '';
        document.getElementById('komisyonBilgi').innerHTML = 
          '💰 Mevcut Durum: Varlik <strong>' + formatMoney(varlik) + '</strong> - Hakedis <strong>' + formatMoney(hakedis) + '</strong> = <strong>' + sign + formatMoney(fark) + '</strong>' +
          '<br>📊 Komisyon (%' + (parseFloat(c.komisyon_orani)||0) + '): <strong>' + (komisyon>=0?'+':'') + formatMoney(komisyon) + ' TL</strong>';
      } else {
        document.getElementById('komisyonBilgi').innerHTML = 'ℹ️ Canli veri geldiginde komisyon hesaplanacak.';
      }
    }

    function handleModalBackdrop(e) {
      if (e.target === document.getElementById('editModal')) closeEditModal();
    }

    function closeEditModal() {
      document.getElementById('editModal').classList.remove('show');
    }

    async function saveCustomer() {
      const hesap_no = document.getElementById('editHesapNo').value;
      const data = {
        baslangic_parasi: parseFloat(document.getElementById('editBaslangic').value) || 0,
        hakedis_miktari: parseFloat(document.getElementById('editHakedis').value) || 0,
        komisyon_orani: parseInt(document.getElementById('editKomisyon').value) || 0,
        para_birimi: document.getElementById('editParaBirimi').value,
        es_dost: document.getElementById('editEsDost').checked,
        aktif: document.getElementById('editAktif').checked
      };

      try {
        const res = await fetch('/api/kayit/' + hesap_no, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data)
        });
        if (res.ok) {
          closeEditModal();
          await loadData();
        } else {
          alert('Kayit sirasinda hata olustu!');
        }
      } catch (e) {
        alert('Baglanti hatasi!');
      }
    }

    async function loadData() {
      try {
        const [mRes, kayitliRes, kurRes] = await Promise.all([
          fetch('/api/musteriler'),
          fetch('/api/kayitli'),
          fetch('/api/kur')
        ]);
        allCustomers = await mRes.json();
        kayitliCustomers = await kayitliRes.json();
        const kurData = await kurRes.json();
        DOLAR_KURU = kurData.kur || 43;
        MARKET_OPEN = kurData.marketOpen;
        updateCounts();
        renderCards();
      } catch (e) {
        console.error(e);
      }
    }

    loadData();
    setInterval(loadData, 60000);
  </script>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server port ' + PORT));
