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

// Tablolari olustur
async function initDB() {
  try {
    // Musteri veri tablosu (MQL'den gelen)
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
    
    // Musteri kayit tablosu (manuel giris)
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
    
    // Mevcut musterileri ekle (sadece bossa)
    const check = await pool.query('SELECT COUNT(*) FROM musteri_kayit');
    if (parseInt(check.rows[0].count) === 0) {
      await insertInitialCustomers();
    }
  } catch (err) {
    console.error('Tablo hatasi:', err.message);
  }
}

// 73 musteriyi ekle
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

// Dolar kuru (basit API)
async function getDolarKuru() {
  try {
    // Varsayilan kur - gercek API eklenebilir
    return 38.5;
  } catch (e) {
    return 38.5;
  }
}

// MQL'den veri al
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
    console.log('Veri alindi:', hesap_no, isim);
    res.json({ ok: true });
  } catch (err) {
    console.error('Veri kayit hatasi:', err);
    res.status(500).json({ error: err.message });
  }
});

// Tum verileri getir (birlesik)
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

// Kayitli musteriler (liste)
app.get('/api/kayitli', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musteri_kayit ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Yeni musteri ekle
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

// Musteri guncelle
app.put('/api/kayit/:hesap_no', async (req, res) => {
  try {
    const { hesap_no } = req.params;
    const { hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif } = req.body;
    await pool.query(
      'UPDATE musteri_kayit SET hakedis_miktari=$1, komisyon_orani=$2, para_birimi=$3, es_dost=$4, aktif=$5 WHERE hesap_no=$6',
      [hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif, hesap_no]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dolar kuru endpoint
app.get('/api/kur', async (req, res) => {
  const kur = await getDolarKuru();
  res.json({ kur });
});

// Ana sayfa
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
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
    .settings-btn{position:absolute;right:15px;top:50%;transform:translateY(-50%);background:rgba(255,255,255,0.2);border:none;color:#fff;padding:8px 12px;border-radius:8px;cursor:pointer}
    .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px;padding:10px}
    .stat-card{background:#fff;padding:10px;border-radius:8px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
    .stat-value{font-size:1rem;font-weight:bold;color:#1a73e8}
    .stat-label{font-size:0.65rem;color:#666;margin-top:2px}
    .alerts{padding:8px 10px;display:flex;gap:6px;flex-wrap:wrap}
    .alert-btn{padding:6px 10px;border-radius:15px;border:none;font-size:0.7rem;cursor:pointer;display:flex;align-items:center;gap:4px}
    .alert-btn.warning{background:#fef3c7;color:#92400e}
    .alert-btn.danger{background:#fee2e2;color:#991b1b}
    .alert-btn.success{background:#d1fae5;color:#065f46}
    .container{padding:10px}
    .table-wrapper{background:#fff;border-radius:8px;overflow-x:auto;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
    table{width:100%;border-collapse:collapse;font-size:0.75rem}
    th{background:#f8f9fa;padding:8px 6px;text-align:left;font-weight:600;color:#555;border-bottom:2px solid #e5e7eb;white-space:nowrap}
    td{padding:6px;border-bottom:1px solid #f0f0f0;white-space:nowrap}
    tr:hover{background:#f8fafc}
    .status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px}
    .status-online{background:#22c55e}
    .status-offline{background:#ef4444}
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
    <button class="settings-btn" onclick="showSettings()">⚙️</button>
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
  
  <!-- Modal: Uyarilar -->
  <div class="modal" id="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalTitle">Uyari</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <ul class="modal-list" id="modalList"></ul>
    </div>
  </div>
  
  <!-- Modal: Ayarlar -->
  <div class="modal" id="settingsModal">
    <div class="modal-content" style="width:350px">
      <div class="modal-header">
        <h3>Ayarlar</h3>
        <button class="modal-close" onclick="closeSettings()">×</button>
      </div>
      <div class="tabs">
        <button class="tab active" onclick="showTab('add')">Yeni Ekle</button>
        <button class="tab" onclick="showTab('list')">Liste</button>
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
    let DOLAR_KURU = 38.5;
    
    function formatMoney(n) {
      if (n === null || n === undefined || isNaN(n)) return '0';
      return new Intl.NumberFormat('tr-TR').format(Math.round(n));
    }
    
    function isActive(lastUpdate) {
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
    
    function showTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      event.target.classList.add('active');
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
        '<br><small>Hakedis: ' + formatMoney(k.hakedis_miktari) + '</small>' +
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
        const [dataRes, kurRes] = await Promise.all([fetch('/api/musteriler'), fetch('/api/kur')]);
        allData = await dataRes.json();
        const kurData = await kurRes.json();
        DOLAR_KURU = kurData.kur || 38.5;
        
        // Kayitli listesi
        const kayitliRes = await fetch('/api/kayitli');
        kayitliData = await kayitliRes.json();
        const kayitliIDs = kayitliData.map(k => k.hesap_no);
        
        const activeCount = allData.filter(c => isActive(c.son_guncelleme)).length;
        const totalBalance = allData.reduce((s, c) => s + (parseFloat(c.varlik) || 0), 0);
        const todayProfit = allData.reduce((s, c) => s + (parseFloat(c.bugun_kar) || 0), 0);
        const avgPct = allData.length > 0 ? allData.reduce((s, c) => s + (parseFloat(c.bugun_yuzde) || 0), 0) / allData.length : 0;
        const totalKomisyon = allData.reduce((s, c) => s + calcKomisyon(c), 0);
        
        document.getElementById('totalCustomers').textContent = allData.length + '/' + kayitliData.filter(k=>k.aktif!==false).length;
        document.getElementById('activeCustomers').textContent = activeCount;
        document.getElementById('totalBalance').textContent = formatMoney(totalBalance);
        document.getElementById('todayProfit').textContent = (todayProfit >= 0 ? '+' : '') + formatMoney(todayProfit);
        document.getElementById('todayProfit').className = 'stat-value ' + (todayProfit >= 0 ? 'positive' : 'negative');
        document.getElementById('avgPct').textContent = (avgPct >= 0 ? '+' : '') + avgPct.toFixed(2) + '%';
        document.getElementById('avgPct').className = 'stat-value ' + (avgPct >= 0 ? 'positive' : 'negative');
        document.getElementById('komisyon').textContent = (totalKomisyon >= 0 ? '+' : '') + formatMoney(totalKomisyon);
        document.getElementById('komisyon').className = 'stat-value ' + (totalKomisyon >= 0 ? 'positive' : 'negative');
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('tr-TR');
        document.getElementById('kurInfo').textContent = '$1 = ' + DOLAR_KURU.toFixed(2) + ' TL';
        
        // Uyarilar
        const majPos = getMajorityPosition(allData);
        const posIssues = allData.filter(c => (c.acik_pozisyon || 0) !== majPos);
        const inactiveList = allData.filter(c => !isActive(c.son_guncelleme));
        const { mean, stdDev } = getStdDev(allData);
        const outliers = allData.filter(c => Math.abs((parseFloat(c.bugun_yuzde) || 0) - mean) > stdDev * 2);
        
        // Kayitli olup veri gelmeyenler
        const gelenIDs = allData.map(m => m.hesap_no);
        const gelmeyenler = kayitliData.filter(k => k.aktif !== false && !gelenIDs.includes(k.hesap_no));
        
        let alertsHtml = '';
        if (gelmeyenler.length > 0) alertsHtml += '<button class="alert-btn danger" onclick="showGelmeyenler()">🚨 Veri Yok: ' + gelmeyenler.length + '</button>';
        if (inactiveList.length > 0) alertsHtml += '<button class="alert-btn danger" onclick="showInactive()">⚠ Pasif: ' + inactiveList.length + '</button>';
        if (posIssues.length > 0) alertsHtml += '<button class="alert-btn warning" onclick="showPosIssues()">📊 Poz: ' + posIssues.length + '</button>';
        if (outliers.length > 0) alertsHtml += '<button class="alert-btn warning" onclick="showOutliers()">📈 Sapma: ' + outliers.length + '</button>';
        if (alertsHtml === '') alertsHtml = '<button class="alert-btn success">✓ Normal</button>';
        document.getElementById('alerts').innerHTML = alertsHtml;
        
        // Tablo
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
          
          return '<tr class="' + rowClass + '">' +
            '<td><span class="status-dot ' + (active ? 'status-online' : 'status-offline') + '"></span></td>' +
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
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server port ' + PORT));
