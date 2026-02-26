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

// Veritabanı tablosunu oluştur
pool.query(`
  CREATE TABLE IF NOT EXISTS musteriler (
    id SERIAL PRIMARY KEY,
    hesap_no VARCHAR(50),
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
`).catch(console.error);

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
    
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Tüm müşterileri getir
app.get('/api/musteriler', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM musteriler ORDER BY varlik DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ana sayfa - Panel
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Müşteri Paneli</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; }
    .header { background: linear-gradient(135deg, #1a73e8, #0d47a1); color: white; padding: 20px; text-align: center; }
    .header h1 { font-size: 1.5rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; padding: 15px; }
    .stat-card { background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .stat-value { font-size: 1.5rem; font-weight: bold; color: #1a73e8; }
    .stat-label { font-size: 0.8rem; color: #666; margin-top: 5px; }
    .container { padding: 15px; }
    .customer-card { background: white; border-radius: 10px; padding: 15px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
    .customer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .customer-name { font-weight: bold; color: #333; }
    .customer-id { font-size: 0.8rem; color: #666; }
    .customer-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .customer-stat { text-align: center; padding: 8px; background: #f8f9fa; border-radius: 8px; }
    .customer-stat-value { font-weight: bold; color: #333; }
    .customer-stat-label { font-size: 0.7rem; color: #666; }
    .positive { color: #0d9488 !important; }
    .negative { color: #dc2626 !important; }
    .refresh-btn { position: fixed; bottom: 20px; right: 20px; background: #1a73e8; color: white; border: none; padding: 15px 20px; border-radius: 50px; font-size: 1rem; cursor: pointer; box-shadow: 0 4px 15px rgba(26,115,232,0.4); }
    .loading { text-align: center; padding: 50px; color: #666; }
    .last-update { text-align: center; padding: 10px; font-size: 0.8rem; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Müşteri Takip Paneli</h1>
  </div>
  
  <div class="stats" id="stats">
    <div class="stat-card">
      <div class="stat-value" id="totalCustomers">-</div>
      <div class="stat-label">Toplam Müşteri</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="totalBalance">-</div>
      <div class="stat-label">Toplam Varlık</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="todayProfit">-</div>
      <div class="stat-label">Bugünkü Kar</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" id="activeCount">-</div>
      <div class="stat-label">Açık Pozisyon</div>
    </div>
  </div>
  
  <div class="last-update">Son güncelleme: <span id="lastUpdate">-</span></div>
  
  <div class="container" id="customers">
    <div class="loading">Yükleniyor...</div>
  </div>
  
  <button class="refresh-btn" onclick="loadData()">Yenile</button>
  
  <script>
    function formatMoney(n) {
      return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n || 0);
    }
    
    async function loadData() {
      try {
        const res = await fetch('/api/musteriler');
        const data = await res.json();
        
        // İstatistikler
        document.getElementById('totalCustomers').textContent = data.length;
        document.getElementById('totalBalance').textContent = formatMoney(data.reduce((s, c) => s + parseFloat(c.varlik || 0), 0));
        document.getElementById('todayProfit').textContent = formatMoney(data.reduce((s, c) => s + parseFloat(c.bugun_kar || 0), 0));
        document.getElementById('activeCount').textContent = data.reduce((s, c) => s + parseInt(c.acik_pozisyon || 0), 0);
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('tr-TR');
        
        // Müşteri listesi
        const container = document.getElementById('customers');
        if (data.length === 0) {
          container.innerHTML = '<div class="loading">Henüz veri yok. MQL bağlantısı bekleniyor...</div>';
          return;
        }
        
        container.innerHTML = data.map(c => \`
          <div class="customer-card">
            <div class="customer-header">
              <div>
                <div class="customer-name">\${c.isim || 'İsimsiz'}</div>
                <div class="customer-id">#\${c.hesap_no}</div>
              </div>
              <div class="customer-stat-value">\${formatMoney(c.varlik)}</div>
            </div>
            <div class="customer-stats">
              <div class="customer-stat">
                <div class="customer-stat-value \${parseFloat(c.bugun_kar) >= 0 ? 'positive' : 'negative'}">\${formatMoney(c.bugun_kar)}</div>
                <div class="customer-stat-label">Bugün</div>
              </div>
              <div class="customer-stat">
                <div class="customer-stat-value">\${c.toplam_yuzde}%</div>
                <div class="customer-stat-label">Toplam</div>
              </div>
              <div class="customer-stat">
                <div class="customer-stat-value">\${c.acik_pozisyon}</div>
                <div class="customer-stat-label">Açık</div>
              </div>
              <div class="customer-stat">
                <div class="customer-stat-value">\${c.kapali_pozisyon}</div>
                <div class="customer-stat-label">Kapalı</div>
              </div>
            </div>
          </div>
        \`).join('');
      } catch (err) {
        console.error(err);
      }
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
