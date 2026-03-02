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

// Veritabani tablosunu olustur
async function initDB() {
  try {
    await pool.query('DROP TABLE IF EXISTS musteriler');
    await pool.query(`
      CREATE TABLE musteriler (
        id SERIAL PRIMARY KEY,
        hesap_no VARCHAR(50) UNIQUE,
        isim VARCHAR(100),
        varlik DECIMAL(15,2),
        toplam_yuzde DECIMAL(5,2),
        bugun_kar DECIMAL(15,2),
        acik_pozisyon INT,
        kapali_pozisyon INT,
        buyukluk DECIMAL(15,2),
        bugun_yuzde DECIMAL(5,2),
        son_guncelleme TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Tablo olusturuldu');
  } catch (err) {
    console.error('Tablo hatasi:', err.message);
  }
}
initDB();

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

app.get('/api/musteriler', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musteriler ORDER BY varlik DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/test', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, message: 'Veritabani baglantisi basarili' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Musteri Paneli</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; font-size: 14px; }
    .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); color: white; padding: 15px; text-align: center; }
    .header h1 { font-size: 1.3rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; padding: 10px; }
    .stat-card { background: white; padding: 10px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-value { font-size: 1.1rem; font-weight: bold; color: #1a73e8; }
    .stat-label { font-size: 0.7rem; color: #666; margin-top: 3px; }
    .alerts { padding: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
    .alert-btn { padding: 8px 12px; border-radius: 20px; border: none; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 5px; }
    .alert-btn.warning { background: #fef3c7; color: #92400e; }
    .alert-btn.danger { background: #fee2e2; color: #991b1b; }
    .alert-btn.success { background: #d1fae5; color: #065f46; }
    .alert-btn:hover { opacity: 0.8; }
    .container { padding: 10px; }
    .table-wrapper { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { background: #f8f9fa; padding: 10px 8px; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
    td { padding: 8px; border-bottom: 1px solid #f0f0f0; }
    tr:hover { background: #f8fafc; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
    .status-online { background: #22c55e; }
    .status-offline { background: #ef4444; }
    .positive { color: #0d9488; }
    .negative { color: #dc2626; }
    .highlight { background: #fef3c7 !important; }
    .refresh-btn { position: fixed; bottom: 15px; right: 15px; background: #1a73e8; color: white; border: none; width: 50px; height: 50px; border-radius: 50%; font-size: 1.2rem; cursor: pointer; box-shadow: 0 4px 15px rgba(26,115,232,0.4); }
    .loading { text-align: center; padding: 30px; color: #666; }
    .last-update { text-align: center; padding: 8px; font-size: 0.7rem; color: #888; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; align-items: center; justify-content: center; }
    .modal.show { display: flex; }
    .modal-content { background: white; padding: 20px; border-radius: 12px; max-width: 90%; max-height: 80%; overflow: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; }
    .modal-list { list-style: none; }
    .modal-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Musteri Takip Paneli</h1>
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
      <div class="stat-label">Ort. Bugun %</div>
    </div>
  </div>
  
  <div class="alerts" id="alerts"></div>
  
  <div class="last-update">Son guncelleme: <span id="lastUpdate">-</span></div>
  
  <div class="container">
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Durum</th>
            <th>Isim</th>
            <th>Varlik</th>
            <th>Bugun TL</th>
            <th>Bugun %</th>
            <th>Acik</th>
          </tr>
        </thead>
        <tbody id="customerTable">
          <tr><td colspan="6" class="loading">Yukleniyor...</td></tr>
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
  
  <script>
    let allData = [];
    
    function formatMoney(n) {
      if (n === null || n === undefined) return '0';
      return new Intl.NumberFormat('tr-TR').format(Math.round(n));
    }
    
    function isActive(lastUpdate) {
      if (!lastUpdate) return false;
      const diff = (new Date() - new Date(lastUpdate)) / 1000 / 60;
      return diff < 65;
    }
    
    function getMajorityPosition(data) {
      const counts = {};
      data.forEach(c => {
        const pos = c.acik_pozisyon || 0;
        counts[pos] = (counts[pos] || 0) + 1;
      });
      let maxCount = 0, majority = 0;
      for (const [pos, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          majority = parseInt(pos);
        }
      }
      return majority;
    }
    
    function getStdDev(data) {
      const values = data.map(c => parseFloat(c.bugun_yuzde) || 0);
      if (values.length === 0) return { mean: 0, stdDev: 0 };
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const sqDiffs = values.map(v => Math.pow(v - mean, 2));
      const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / values.length;
      return { mean, stdDev: Math.sqrt(avgSqDiff) };
    }
    
    function showModal(title, items) {
      document.getElementById('modalTitle').textContent = title;
      document.getElementById('modalList').innerHTML = items.map(i => '<li>' + i + '</li>').join('');
      document.getElementById('modal').classList.add('show');
    }
    
    function closeModal() {
      document.getElementById('modal').classList.remove('show');
    }
    
    async function loadData() {
      try {
        const res = await fetch('/api/musteriler');
        allData = await res.json();
        
        const activeCount = allData.filter(c => isActive(c.son_guncelleme)).length;
        const totalBalance = allData.reduce((s, c) => s + parseFloat(c.varlik || 0), 0);
        const todayProfit = allData.reduce((s, c) => s + parseFloat(c.bugun_kar || 0), 0);
        const avgPct = allData.length > 0 ? allData.reduce((s, c) => s + parseFloat(c.bugun_yuzde || 0), 0) / allData.length : 0;
        
        document.getElementById('totalCustomers').textContent = allData.length;
        document.getElementById('activeCustomers').textContent = activeCount;
        document.getElementById('totalBalance').textContent = formatMoney(totalBalance) + ' TL';
        document.getElementById('todayProfit').textContent = (todayProfit >= 0 ? '+' : '') + formatMoney(todayProfit) + ' TL';
        document.getElementById('todayProfit').className = 'stat-value ' + (todayProfit >= 0 ? 'positive' : 'negative');
        document.getElementById('avgPct').textContent = (avgPct >= 0 ? '+' : '') + avgPct.toFixed(2) + '%';
        document.getElementById('avgPct').className = 'stat-value ' + (avgPct >= 0 ? 'positive' : 'negative');
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('tr-TR');
        
        // Uyarilar
        const majorityPos = getMajorityPosition(allData);
        const positionIssues = allData.filter(c => (c.acik_pozisyon || 0) !== majorityPos);
        const inactiveList = allData.filter(c => !isActive(c.son_guncelleme));
        const { mean, stdDev } = getStdDev(allData);
        const outliers = allData.filter(c => Math.abs((parseFloat(c.bugun_yuzde) || 0) - mean) > stdDev * 2);
        
        let alertsHtml = '';
        if (inactiveList.length > 0) {
          alertsHtml += '<button class="alert-btn danger" onclick="showInactive()">⚠ Pasif: ' + inactiveList.length + ' kisi</button>';
        }
        if (positionIssues.length > 0) {
          alertsHtml += '<button class="alert-btn warning" onclick="showPositionIssues()">📊 Pozisyon Farki: ' + positionIssues.length + ' kisi</button>';
        }
        if (outliers.length > 0) {
          alertsHtml += '<button class="alert-btn warning" onclick="showOutliers()">📈 Kar Sapmasi: ' + outliers.length + ' kisi</button>';
        }
        if (alertsHtml === '') {
          alertsHtml = '<button class="alert-btn success">✓ Her sey normal</button>';
        }
        document.getElementById('alerts').innerHTML = alertsHtml;
        
        // Tablo
        const tbody = document.getElementById('customerTable');
        if (allData.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="loading">Henuz veri yok</td></tr>';
          return;
        }
        
        tbody.innerHTML = allData.map(c => {
          const active = isActive(c.son_guncelleme);
          const bugunKar = parseFloat(c.bugun_kar) || 0;
          const bugunPct = parseFloat(c.bugun_yuzde) || 0;
          const posIssue = (c.acik_pozisyon || 0) !== majorityPos;
          const isOutlier = Math.abs(bugunPct - mean) > stdDev * 2;
          const rowClass = (posIssue || isOutlier) ? 'highlight' : '';
          
          return '<tr class="' + rowClass + '">' +
            '<td><span class="status-dot ' + (active ? 'status-online' : 'status-offline') + '"></span></td>' +
            '<td><strong>' + (c.isim || '-') + '</strong><br><small style="color:#888">#' + c.hesap_no + '</small></td>' +
            '<td>' + formatMoney(c.varlik) + '</td>' +
            '<td class="' + (bugunKar >= 0 ? 'positive' : 'negative') + '">' + (bugunKar >= 0 ? '+' : '') + formatMoney(bugunKar) + '</td>' +
            '<td class="' + (bugunPct >= 0 ? 'positive' : 'negative') + '">' + (bugunPct >= 0 ? '+' : '') + bugunPct.toFixed(2) + '%</td>' +
            '<td>' + (c.acik_pozisyon || 0) + '</td>' +
          '</tr>';
        }).join('');
        
      } catch (err) {
        console.error(err);
      }
    }
    
    function showInactive() {
      const list = allData.filter(c => !isActive(c.son_guncelleme)).map(c => c.isim + ' (#' + c.hesap_no + ')');
      showModal('Pasif Musteriler (65+ dk)', list);
    }
    
    function showPositionIssues() {
      const majorityPos = getMajorityPosition(allData);
      const list = allData.filter(c => (c.acik_pozisyon || 0) !== majorityPos)
        .map(c => c.isim + ' - Acik: ' + (c.acik_pozisyon || 0) + ' (olmasi gereken: ' + majorityPos + ')');
      showModal('Pozisyon Farki Olanlar', list);
    }
    
    function showOutliers() {
      const { mean, stdDev } = getStdDev(allData);
      const list = allData.filter(c => Math.abs((parseFloat(c.bugun_yuzde) || 0) - mean) > stdDev * 2)
        .map(c => c.isim + ' - Bugun: ' + (parseFloat(c.bugun_yuzde) || 0).toFixed(2) + '% (ort: ' + mean.toFixed(2) + '%)');
      showModal('Kar Sapmasi Olanlar', list);
    }
    
    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
