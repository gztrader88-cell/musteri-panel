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

const MARKET_START = 9.5;
const MARKET_END = 18;

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
        rdp_ip VARCHAR(100),
        rdp_kullanici VARCHAR(100),
        rdp_sifre VARCHAR(200),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Mevcut tabloya RDP kolonlari ekle (zaten varsa hata vermez)
    await pool.query(`ALTER TABLE musteri_kayit ADD COLUMN IF NOT EXISTS rdp_ip VARCHAR(100)`);
    await pool.query(`ALTER TABLE musteri_kayit ADD COLUMN IF NOT EXISTS rdp_kullanici VARCHAR(100)`);
    await pool.query(`ALTER TABLE musteri_kayit ADD COLUMN IF NOT EXISTS rdp_sifre VARCHAR(200)`);
    await pool.query(`ALTER TABLE musteri_kayit ADD COLUMN IF NOT EXISTS sozlesme_link TEXT`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS kopukluk_bildirimleri (
        id SERIAL PRIMARY KEY,
        hesap_no VARCHAR(50),
        isim VARCHAR(100),
        durum VARCHAR(20) DEFAULT 'kopuk',
        kopus_zamani TIMESTAMP DEFAULT NOW(),
        baglanti_zamani TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ayrilanlar (
        id SERIAL PRIMARY KEY,
        hesap_no VARCHAR(50),
        isim VARCHAR(100),
        son_varlik DECIMAL(20,2),
        para_birimi VARCHAR(10) DEFAULT 'TL',
        es_dost BOOLEAN DEFAULT false,
        komisyon_orani DECIMAL(10,2),
        sozlesme_link TEXT,
        aktif BOOLEAN DEFAULT true,
        ayilis_tarihi TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS grafik_uyarilari (
        id SERIAL PRIMARY KEY,
        hesap_no VARCHAR(50),
        isim VARCHAR(100),
        mesaj TEXT,
        durum VARCHAR(20) DEFAULT 'aktif',
        olusma_zamani TIMESTAMP DEFAULT NOW(),
        cozulme_zamani TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS para_hareketleri (
        id SERIAL PRIMARY KEY,
        hesap_no VARCHAR(50),
        isim VARCHAR(100),
        miktar DECIMAL(20,2),
        islem_turu VARCHAR(20),
        durum VARCHAR(20) DEFAULT 'bekliyor',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS robot_gunluk (
        id SERIAL PRIMARY KEY,
        tarih DATE UNIQUE,
        bakiye DECIMAL(20,2),
        gunluk_pct DECIMAL(10,4),
        musteri_sayisi INT,
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
  // [hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, rdp_ip, rdp_kullanici, rdp_sifre]
  const customers = [
    ['7197904', 1669470, 1669470, 30, 'USD', false, '45.10.151.164:1414', 'Administrator', '3H.L8a1y3J+Cvr'],
    ['7197832', 530194,  530194,  25, 'TL',  false, '45.10.151.156:1414', 'Administrator', '*5S34z]fWlFo1C'],
    ['7198743', 1186432, 1186432, 25, 'TL',  false, '45.10.151.237:1414', 'Administrator', 'oZy9Ha6TPHFCUJ7O'],
    ['7189653', 651271,  651271,  25, 'TL',  false, '185.86.4.103',       'Administrator', '59ifjWHR9q'],
    ['7196328', 362313,  362313,  25, 'TL',  false, '37.247.99.113',      'Administrator', 'nyd53G5cEVmy'],
    ['7197811', 281661,  281661,  25, 'TL',  false, '185.86.4.83',        'Administrator', 'gN2BZ5r62x'],
    ['7203341', 1805322, 1805322, 20, 'TL',  false, '185.86.4.28',        'administrator', '2TMD7qR35g'],
    ['7211932', 292615,  292615,  25, 'TL',  false, '185.130.57.226',     'administrator', 'G6rEkP6nvh7'],
    ['7220676', 1169620, 1169620, 20, 'TL',  false, '213.238.182.197',    'administrator', 'Ataman312'],
    ['7220548', 1054661, 1054661, 25, 'TL',  false, '193.38.34.60',       'administrator', 'Furkan312'],
    ['7220666', 506916,  506916,  25, 'TL',  false, '213.238.182.100',    'administrator', 'AlimAydin320'],
    ['7220695', 374960,  374960,  25, 'TL',  false, '77.92.154.199',      'administrator', 'Cengiz318'],
    ['7220690', 347977,  347977,  25, 'TL',  false, '193.38.34.102',      'administrator', 'Banuuyar316'],
    ['7222015', 509982,  509982,  20, 'TL',  false, '45.143.99.78',       'administrator', 'Hsyn3262025'],
    ['7230772', 1153093, 1153093, 20, 'TL',  false, '45.143.99.78',       'administrator', 'Hsyn3262025'],
    ['7221998', 380172,  380172,  25, 'TL',  false, '77.92.154.115',      'administrator', 'Berkant326'],
    ['7227601', 484676,  484676,  25, 'TL',  false, '77.92.154.22',       'administrator', 'Omer622025'],
    ['7227709', 395880,  395880,  25, 'TL',  false, '213.238.182.12',     'administrator', 'Ahmet622025'],
    ['7231831', 695718,  695718,  25, 'TL',  false, '78.135.87.218',      'administrator', 'Emre7172025'],
    ['7231995', 447610,  447610,  25, 'TL',  false, '77.92.154.93',       'administrator', 'Murat7202025'],
    ['7232074', 435275,  435275,  25, 'TL',  false, '193.38.34.253',      'administrator', 'Esra7242025'],
    ['7229339', 333254,  333254,  25, 'TL',  false, '77.92.154.198',      'administrator', 'Mehmet7252025'],
    ['7231837', 527088,  527088,  25, 'TL',  false, '193.38.34.103',      'administrator', 'Muhsin7252025'],
    ['7232402', 784084,  784084,  25, 'TL',  false, '193.38.34.153',      'administrator', 'Filiz8112025'],
    ['7234237', 270110,  270110,  25, 'TL',  false, '45.143.99.10',       'administrator', 'Busra200825'],
    ['7149847', 300000,  300000,  25, 'TL',  false, '37.247.99.30',       'administrator', '6FY6a2cw7vQC'],
    ['7235405', 500000,  500000,  25, 'TL',  false, '193.38.34.188',      'administrator', 'Turkoz170925'],
    ['53659',   250000,  250000,  25, 'TL',  false, '193.38.34.128',      'administrator', 'Zeynep180925'],
    ['7236189', 150000,  150000,  25, 'TL',  false, '78.135.87.117',      'administrator', 'Mursel190925'],
    ['7236065', 350000,  350000,  25, 'TL',  false, '78.135.87.98',       'administrator', 'Okan190925'],
    ['7152100', 400000,  400000,  25, 'TL',  false, '78.135.87.254',      'administrator', 'Elif190925'],
    ['7192610', 350499,  350499,  25, 'TL',  false, '78.135.87.72',       'administrator', 'Derya240925'],
    ['7236029', 250000,  250000,  25, 'TL',  false, '77.92.154.85',       'administrator', 'Serkan180925'],
    ['7236134', 327430,  327430,  25, 'TL',  false, '193.38.34.176',      'administrator', 'Engin031025'],
    ['7236469', 250933,  250933,  25, 'TL',  false, '193.38.34.11',       'administrator', 'Mustafa061025'],
    ['7237612', 273386,  273386,  25, 'TL',  false, '193.38.34.12',       'administrator', 'Serkan101025'],
    ['7237528', 601262,  601262,  25, 'TL',  false, '77.92.154.194',      'administrator', 'Levent131025'],
    ['7237754', 990577,  990577,  20, 'TL',  false, '193.38.34.70',       'administrator', 'Onur101425'],
    ['7237833', 250000,  250000,  25, 'TL',  false, '77.92.154.94',       'administrator', 'Ali141025'],
    ['7237217', 250000,  250000,  25, 'TL',  false, '77.92.154.49',       'administrator', 'Caglar151025'],
    ['7237934', 271669,  271669,  25, 'TL',  false, '193.38.34.221',      'administrator', 'Mesut161025'],
    ['7238855', 450000,  450000,  25, 'TL',  false, '45.143.99.54',       'administrator', 'Engin311025'],
    ['7238958', 250000,  250000,  25, 'TL',  false, '213.238.182.41',     'administrator', 'Mehmet311025'],
    ['7236167', 250000,  250000,  25, 'TL',  false, '213.238.182.155',    'administrator', 'Eren300925'],
    ['7239339', 274523,  274523,  25, 'TL',  false, '78.135.87.48',       'administrator', 'Eren061125'],
    ['7239024', 294893,  294893,  25, 'TL',  false, '213.238.182.70',     'administrator', 'Mahmut171125'],
    ['7236798', 279505,  279505,  25, 'TL',  false, '77.92.154.151',      'administrator', 'Yuksel171125'],
    ['7235550', 271803,  271803,  25, 'TL',  false, '193.38.34.146',      'administrator', 'Erkan241125'],
    ['7240771', 1121442, 1121442, 20, 'TL',  false, '213.238.182.176',    'administrator', 'Ozden281125'],
    ['7240908', 250000,  250000,  25, 'TL',  false, '78.135.87.90',       'administrator', 'Sukru291125'],
    ['7195843', 290556,  290556,  25, 'TL',  false, '213.238.182.63',     'administrator', '4G2jSu5caq'],
    ['7241368', 398686,  398686,  25, 'TL',  false, '213.238.182.93',     'administrator', 'Gokhan031225'],
    ['7241996', 287644,  287644,  25, 'TL',  false, '45.143.99.142',      'administrator', 'Muhammet121225'],
    ['7237486', 303768,  303768,  25, 'TL',  false, '193.38.34.227',      'administrator', 'Ihsan091025'],
    ['53618',   250000,  250000,  25, 'TL',  false, '77.92.154.81',       'administrator', 'Akkaya161225'],
    ['7242011', 264377,  264377,  25, 'TL',  false, '77.92.154.188',      'administrator', 'Kerem171225'],
    ['7243614', 250000,  250000,  25, 'TL',  false, '77.92.154.184',      'administrator', 'Birsen060126'],
    ['7243582', 440000,  440000,  25, 'TL',  false, '193.38.34.170',      'administrator', 'Ferdi070126'],
    ['7243488', 500000,  500000,  25, 'TL',  false, '193.38.34.192',      'administrator', 'Tamer070126'],
    ['7243619', 1000000, 1000000, 25, 'TL',  false, '45.143.99.209',      'administrator', 'Taha080126'],
    ['7244161', 250000,  250000,  25, 'TL',  false, '78.135.87.241',      'administrator', 'Oguzcan200126'],
    ['7189496', 350000,  350000,  25, 'TL',  false, '193.38.34.39',       'administrator', 'Emre200126'],
    ['99303048',2000000, 2000000, 20, 'TL',  false, '78.135.87.46',       'administrator', 'Levent270126'],
    ['7245343', 250000,  250000,  25, 'TL',  false, '193.38.34.67',       'Administrator', 'u?4UqpnFDR'],
    ['7236080', 250000,  250000,  25, 'TL',  false, '193.38.34.69',       'Administrator', '1=AjkIXdmg'],
    ['7237690', 252000,  252000,  25, 'TL',  false, '131.222.130.26',     'Administrator', 'EJ%3j2gOoM'],
    ['7247038', 500000,  500000,  25, 'TL',  false, '45.143.99.232',      'Administrator', '40fePE?vDK'],
    ['53658',   400000,  400000,  25, 'TL',  false, '77.92.154.168',      'administrator', 'Ahmet311025'],
    ['7149714', 200000,  200000,  0,  'TL',  true,  '185.130.57.130',     'administrator', 'e0bjmBI4LzM7'],
    ['7133687', 40000,   40000,   0,  'TL',  true,  '185.130.57.133',     'administrator', 'vZP8O3sFc28d'],
    ['7134170', 100000,  100000,  0,  'TL',  true,  '185.184.27.102',     'makdos',        'r2e84ZN2KO4a']
  ];

  for (const c of customers) {
    try {
      await pool.query(
        'INSERT INTO musteri_kayit (hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, rdp_ip, rdp_kullanici, rdp_sifre) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
        c
      );
    } catch (e) { console.log('Insert error:', e.message); }
  }
  console.log('Musteriler eklendi');
}

// Mevcut musterilere RDP bilgisi ekle (rdp_ip bos olanlari guncelle)
async function syncRdpData() {
  const rdpMap = {
    '7197904': ['45.10.151.164:1414', 'Administrator', '3H.L8a1y3J+Cvr'],
    '7197832': ['45.10.151.156:1414', 'Administrator', '*5S34z]fWlFo1C'],
    '7198743': ['45.10.151.237:1414', 'Administrator', 'oZy9Ha6TPHFCUJ7O'],
    '7189653': ['185.86.4.103',       'Administrator', '59ifjWHR9q'],
    '7196328': ['37.247.99.113',      'Administrator', 'nyd53G5cEVmy'],
    '7197811': ['185.86.4.83',        'Administrator', 'gN2BZ5r62x'],
    '7203341': ['185.86.4.28',        'administrator', '2TMD7qR35g'],
    '7211932': ['185.130.57.226',     'administrator', 'G6rEkP6nvh7'],
    '7220676': ['213.238.182.197',    'administrator', 'Ataman312'],
    '7220548': ['193.38.34.60',       'administrator', 'Furkan312'],
    '7220666': ['213.238.182.100',    'administrator', 'AlimAydin320'],
    '7220695': ['77.92.154.199',      'administrator', 'Cengiz318'],
    '7220690': ['193.38.34.102',      'administrator', 'Banuuyar316'],
    '7222015': ['45.143.99.78',       'administrator', 'Hsyn3262025'],
    '7230772': ['45.143.99.78',       'administrator', 'Hsyn3262025'],
    '7221998': ['77.92.154.115',      'administrator', 'Berkant326'],
    '7227601': ['77.92.154.22',       'administrator', 'Omer622025'],
    '7227709': ['213.238.182.12',     'administrator', 'Ahmet622025'],
    '7231831': ['78.135.87.218',      'administrator', 'Emre7172025'],
    '7231995': ['77.92.154.93',       'administrator', 'Murat7202025'],
    '7232074': ['193.38.34.253',      'administrator', 'Esra7242025'],
    '7229339': ['77.92.154.198',      'administrator', 'Mehmet7252025'],
    '7231837': ['193.38.34.103',      'administrator', 'Muhsin7252025'],
    '7232402': ['193.38.34.153',      'administrator', 'Filiz8112025'],
    '7234237': ['45.143.99.10',       'administrator', 'Busra200825'],
    '7149847': ['37.247.99.30',       'administrator', '6FY6a2cw7vQC'],
    '7235405': ['193.38.34.188',      'administrator', 'Turkoz170925'],
    '53659':   ['193.38.34.128',      'administrator', 'Zeynep180925'],
    '7236189': ['78.135.87.117',      'administrator', 'Mursel190925'],
    '7236065': ['78.135.87.98',       'administrator', 'Okan190925'],
    '7152100': ['78.135.87.254',      'administrator', 'Elif190925'],
    '7192610': ['78.135.87.72',       'administrator', 'Derya240925'],
    '7236029': ['77.92.154.85',       'administrator', 'Serkan180925'],
    '7236134': ['193.38.34.176',      'administrator', 'Engin031025'],
    '7236469': ['193.38.34.11',       'administrator', 'Mustafa061025'],
    '7237612': ['193.38.34.12',       'administrator', 'Serkan101025'],
    '7237528': ['77.92.154.194',      'administrator', 'Levent131025'],
    '7237754': ['193.38.34.70',       'administrator', 'Onur101425'],
    '7237833': ['77.92.154.94',       'administrator', 'Ali141025'],
    '7237217': ['77.92.154.49',       'administrator', 'Caglar151025'],
    '7237934': ['193.38.34.221',      'administrator', 'Mesut161025'],
    '7238855': ['45.143.99.54',       'administrator', 'Engin311025'],
    '7238958': ['213.238.182.41',     'administrator', 'Mehmet311025'],
    '7236167': ['213.238.182.155',    'administrator', 'Eren300925'],
    '7239339': ['78.135.87.48',       'administrator', 'Eren061125'],
    '7239024': ['213.238.182.70',     'administrator', 'Mahmut171125'],
    '7236798': ['77.92.154.151',      'administrator', 'Yuksel171125'],
    '7235550': ['193.38.34.146',      'administrator', 'Erkan241125'],
    '7240771': ['213.238.182.176',    'administrator', 'Ozden281125'],
    '7240908': ['78.135.87.90',       'administrator', 'Sukru291125'],
    '7195843': ['213.238.182.63',     'administrator', '4G2jSu5caq'],
    '7241368': ['213.238.182.93',     'administrator', 'Gokhan031225'],
    '7241996': ['45.143.99.142',      'administrator', 'Muhammet121225'],
    '7237486': ['193.38.34.227',      'administrator', 'Ihsan091025'],
    '53618':   ['77.92.154.81',       'administrator', 'Akkaya161225'],
    '7242011': ['77.92.154.188',      'administrator', 'Kerem171225'],
    '7243614': ['77.92.154.184',      'administrator', 'Birsen060126'],
    '7243582': ['193.38.34.170',      'administrator', 'Ferdi070126'],
    '7243488': ['193.38.34.192',      'administrator', 'Tamer070126'],
    '7243619': ['45.143.99.209',      'administrator', 'Taha080126'],
    '7244161': ['78.135.87.241',      'administrator', 'Oguzcan200126'],
    '7189496': ['193.38.34.39',       'administrator', 'Emre200126'],
    '99303048':['78.135.87.46',       'administrator', 'Levent270126'],
    '7245343': ['193.38.34.67',       'Administrator', 'u?4UqpnFDR'],
    '7236080': ['193.38.34.69',       'Administrator', '1=AjkIXdmg'],
    '7237690': ['131.222.130.26',     'Administrator', 'EJ%3j2gOoM'],
    '7247038': ['45.143.99.232',      'Administrator', '40fePE?vDK'],
    '53658':   ['77.92.154.168',      'administrator', 'Ahmet311025'],
    '7149714': ['185.130.57.130',     'administrator', 'e0bjmBI4LzM7'],
    '7133687': ['185.130.57.133',     'administrator', 'vZP8O3sFc28d'],
    '7134170': ['185.184.27.102',     'makdos',        'r2e84ZN2KO4a']
  };
  let updated = 0;
  for (const [hesap_no, [ip, kullanici, sifre]] of Object.entries(rdpMap)) {
    try {
      const res = await pool.query(
        'UPDATE musteri_kayit SET rdp_ip=$1, rdp_kullanici=$2, rdp_sifre=$3 WHERE hesap_no=$4 AND rdp_ip IS NULL',
        [ip, kullanici, sifre, hesap_no]
      );
      if (res.rowCount > 0) updated++;
    } catch(e) { console.log('RDP sync error:', e.message); }
  }
  if (updated > 0) console.log('RDP bilgisi guncellendi:', updated, 'musteri');
}

initDB().then(async () => {
  await syncRdpData();
  // Eksik kayitlari ekle
  const eksikler = [
    ['53659', 250000, 250000, 25, 'TL', false, '193.38.34.128', 'administrator', 'Zeynep180925'],
    ['53658', 400000, 400000, 25, 'TL', false, '77.92.154.168', 'administrator', 'Ahmet311025']
  ];
  for (const c of eksikler) {
    try {
      await pool.query(
        'INSERT INTO musteri_kayit (hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, rdp_ip, rdp_kullanici, rdp_sifre) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
        c
      );
    } catch(e) {}
  }
  console.log('Eksik kayitlar eklendi');
});

// Dolar kuru
let cachedKur = { value: 43, timestamp: 0 };

async function getDolarKuru() {
  const now = Date.now();
  if (now - cachedKur.timestamp < 600000 && cachedKur.value) return cachedKur.value;
  try {
    const r = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const d = await r.json();
    if (d?.rates?.TRY) { cachedKur = { value: d.rates.TRY, timestamp: now }; return cachedKur.value; }
  } catch (e) {}
  try {
    const r2 = await fetch('https://open.er-api.com/v6/latest/USD');
    const d2 = await r2.json();
    if (d2?.rates?.TRY) { cachedKur = { value: d2.rates.TRY, timestamp: now }; return cachedKur.value; }
  } catch (e) {}
  return cachedKur.value || 43;
}

function isMarketOpen() {
  const now = new Date();
  const tr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
  const day = tr.getDay();
  const hour = tr.getHours() + tr.getMinutes() / 60;
  if (day === 0 || day === 6) return false;
  return hour >= MARKET_START && hour < MARKET_END;
}

// =====================================================
// TELEGRAM OTOMATIK GECE YEDEK
// =====================================================
const TELEGRAM_BACKUP_TOKEN = process.env.TELEGRAM_BACKUP_TOKEN || '';
const TELEGRAM_BACKUP_CHAT  = process.env.TELEGRAM_BACKUP_CHAT  || '';

async function sendTelegramBackup() {
  if (!TELEGRAM_BACKUP_TOKEN || !TELEGRAM_BACKUP_CHAT) {
    console.log('Telegram backup: token veya chat_id tanimlanmamis, atlanıyor.');
    return;
  }
  try {
    const kur = await getDolarKuru();
    const result = await pool.query(`
      SELECT mk.hesap_no, m.isim, mk.baslangic_parasi, mk.komisyon_orani, mk.para_birimi,
             mk.es_dost, mk.aktif, m.varlik, m.bugun_kar, m.son_guncelleme
      FROM musteri_kayit mk
      LEFT JOIN musteriler m ON mk.hesap_no = m.hesap_no
      ORDER BY COALESCE(m.varlik,0) DESC
    `);
    const rows = result.rows;

    function calcKom(c) {
      if (!c.baslangic_parasi || c.es_dost) return 0;
      const varlik = parseFloat(c.varlik) || 0;
      const baslangic = parseFloat(c.baslangic_parasi) || 0;
      const oran = (parseFloat(c.komisyon_orani) || 0) / 100;
      if (c.para_birimi === 'USD') return (varlik / kur - baslangic) * oran * kur;
      return (varlik - baslangic) * oran;
    }

    const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    const totalVarlik = rows.reduce((s, c) => s + (parseFloat(c.varlik) || 0), 0);
    const totalKomisyon = rows.reduce((s, c) => s + calcKom(c), 0);

    const headers = ['Hesap No','Isim','Para Birimi','Varlik','Baslangic','Komisyon %','Komisyon TL','Aktif'];
    const csvRows = rows.map(c => {
      const k = calcKom(c);
      return [
        c.hesap_no, c.isim||'', c.para_birimi||'TL',
        c.varlik||'', c.baslangic_parasi||'',
        c.komisyon_orani||'',
        k > 0 ? Math.round(k) : '',
        c.aktif !== false ? 'Evet' : 'Hayir'
      ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
    });
    const summary = [
      '', '"OZET"',
      '"Toplam Musteri","' + rows.length + '"',
      '"Toplam Varlik","' + Math.round(totalVarlik) + '"',
      '"Toplam Komisyon","' + Math.round(totalKomisyon) + '"',
      '"Kur","' + kur.toFixed(2) + '"',
      '"Tarih","' + now + '"'
    ];
    const csv = '\uFEFF' + headers.map(h => '"'+h+'"').join(',') + '\n' + csvRows.join('\n') + '\n' + summary.join('\n');
    const filename = 'yedek_' + new Date().toISOString().slice(0,10) + '.csv';

    const FormData = (await import('form-data')).default;
    const form = new FormData();
    form.append('chat_id', TELEGRAM_BACKUP_CHAT);
    form.append('caption',
      '🗄️ Otomatik Gece Yedegi - ' + now +
      '\n👥 ' + rows.length + ' musteri' +
      '\n💰 Toplam: ' + new Intl.NumberFormat('tr-TR').format(Math.round(totalVarlik)) + ' TL'
    );
    form.append('document', Buffer.from(csv, 'utf8'), { filename, contentType: 'text/csv' });

    const tgRes = await fetch('https://api.telegram.org/bot' + TELEGRAM_BACKUP_TOKEN + '/sendDocument', {
      method: 'POST', body: form, headers: form.getHeaders()
    });
    const tgData = await tgRes.json();
    if (tgData.ok) console.log('Telegram yedek gonderildi:', filename);
    else console.log('Telegram yedek hatasi:', JSON.stringify(tgData));
  } catch (err) {
    console.error('Telegram backup hatasi:', err.message);
  }
}

function scheduleDailyBackup() {
  function msUntil02() {
    const now = new Date();
    const tr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const next = new Date(tr);
    next.setHours(2, 0, 0, 0);
    if (next <= tr) next.setDate(next.getDate() + 1);
    return next - tr;
  }
  setTimeout(function run() {
    sendTelegramBackup();
    setTimeout(run, 24 * 60 * 60 * 1000);
  }, msUntil02());
  console.log('Gece yedek zamanlandi. Ilk yedek', Math.round(msUntil02()/3600000) + ' saat sonra.');
}
scheduleDailyBackup();

// =====================================================
// ROBOT GUNLUK KAYIT - Her gun 18:30 TRT (15:30 UTC)
// =====================================================
async function saveRobotGunluk() {
  try {
    const now = new Date();
    const tr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const tarih = tr.toISOString().slice(0,10);

    // O gun zaten kayitli mi?
    const existing = await pool.query('SELECT id FROM robot_gunluk WHERE tarih = $1', [tarih]);
    if (existing.rows.length > 0) {
      console.log('Robot gunluk zaten kayitli:', tarih);
      return;
    }

    // Para hareketi olan hesaplari bul (bugun)
    const hareketliHesaplar = await pool.query(
      "SELECT DISTINCT hesap_no FROM para_hareketleri WHERE DATE(created_at AT TIME ZONE 'Europe/Istanbul') = $1",
      [tarih]
    );
    const hareketliSet = new Set(hareketliHesaplar.rows.map(r => r.hesap_no));
    if (hareketliSet.size > 0)
      console.log('Robot gunluk: para hareketi olan hesaplar filtrелениyor:', [...hareketliSet]);

    // Musterilerin bugunki ortalamasini al - para hareketi olanlari cikar
    const result = await pool.query('SELECT hesap_no, bugun_yuzde FROM musteriler WHERE bugun_yuzde IS NOT NULL');
    if (result.rows.length === 0) {
      console.log('Robot gunluk: musteri verisi yok');
      return;
    }
    const vals = result.rows
      .filter(r => !hareketliSet.has(String(r.hesap_no)))
      .map(r => parseFloat(r.bugun_yuzde) || 0);
    if (vals.length === 0) {
      console.log('Robot gunluk: tum hesaplarda hareket var, kayit atiliyor');
      return;
    }
    const ort = vals.reduce((a,b) => a+b, 0) / vals.length;

    // Son bakiyeyi bul
    const lastRow = await pool.query('SELECT bakiye FROM robot_gunluk ORDER BY tarih DESC LIMIT 1');
    let bakiye;
    if (lastRow.rows.length > 0) {
      bakiye = parseFloat(lastRow.rows[0].bakiye) * (1 + ort/100);
    } else {
      // Ilk kayit - hardcoded son Excel bakiyesi
      bakiye = 301216.89 * (1 + ort/100);
    }

    await pool.query(
      'INSERT INTO robot_gunluk (tarih, bakiye, gunluk_pct, musteri_sayisi) VALUES ($1, $2, $3, $4)',
      [tarih, Math.round(bakiye*100)/100, Math.round(ort*10000)/10000, vals.length]
    );
    console.log('Robot gunluk kaydedildi:', tarih, 'bakiye:', Math.round(bakiye), 'ort:', ort.toFixed(3)+'%');
  } catch(err) {
    console.error('Robot gunluk kayit hatasi:', err.message);
  }
}

function scheduleRobotGunluk() {
  function msUntil1830() {
    const now = new Date();
    const tr = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const next = new Date(tr);
    next.setHours(18, 30, 0, 0);
    if (next <= tr) next.setDate(next.getDate() + 1);
    return next - tr;
  }
  setTimeout(function run() {
    saveRobotGunluk();
    setTimeout(run, 24 * 60 * 60 * 1000);
  }, msUntil1830());
  console.log('Robot gunluk kayit zamanlandi. Ilk kayit', Math.round(msUntil1830()/3600000*10)/10 + ' saat sonra (18:30 TRT).');
}
scheduleRobotGunluk();


// =====================================================
// API ENDPOINTS
// =====================================================

app.post('/api/veri', async (req, res) => {
  try {
    const { hesap_no, isim, varlik, toplam_yuzde, bugun_kar, acik, kapali, buyukluk, bugun_yuzde } = req.body;
    await pool.query(`
      INSERT INTO musteriler (hesap_no, isim, varlik, toplam_yuzde, bugun_kar, acik_pozisyon, kapali_pozisyon, buyukluk, bugun_yuzde, son_guncelleme)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (hesap_no) DO UPDATE SET
        isim=$2, varlik=$3, toplam_yuzde=$4, bugun_kar=$5,
        acik_pozisyon=$6, kapali_pozisyon=$7, buyukluk=$8, bugun_yuzde=$9, son_guncelleme=NOW()
    `, [hesap_no, isim, varlik, toplam_yuzde, bugun_kar, acik, kapali, buyukluk, bugun_yuzde]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/musteriler', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, k.baslangic_parasi, k.hakedis_miktari, k.komisyon_orani, k.para_birimi,
             k.es_dost, k.aktif, k.rdp_ip, k.rdp_kullanici, k.rdp_sifre
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
    const { hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, rdp_ip, rdp_kullanici, rdp_sifre } = req.body;
    await pool.query(
      'INSERT INTO musteri_kayit (hesap_no, baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, rdp_ip, rdp_kullanici, rdp_sifre) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [hesap_no, baslangic_parasi, hakedis_miktari || baslangic_parasi, komisyon_orani, para_birimi || 'TL', es_dost || false, rdp_ip||null, rdp_kullanici||null, rdp_sifre||null]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/kayit/:hesap_no', async (req, res) => {
  try {
    const { hesap_no } = req.params;
    const { baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif, rdp_ip, rdp_kullanici, rdp_sifre, sozlesme_link } = req.body;
    await pool.query(
      'UPDATE musteri_kayit SET baslangic_parasi=$1, hakedis_miktari=$2, komisyon_orani=$3, para_birimi=$4, es_dost=$5, aktif=$6, rdp_ip=$7, rdp_kullanici=$8, rdp_sifre=$9, sozlesme_link=$10 WHERE hesap_no=$11',
      [baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif, rdp_ip||null, rdp_kullanici||null, rdp_sifre||null, sozlesme_link||null, hesap_no]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/musteri/:hesap_no', async (req, res) => {
  try {
    const { hesap_no } = req.params;
    await pool.query('DELETE FROM musteri_kayit WHERE hesap_no=$1', [hesap_no]);
    await pool.query('DELETE FROM musteriler WHERE hesap_no=$1', [hesap_no]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kur', async (req, res) => {
  const kur = await getDolarKuru();
  res.json({ kur, marketOpen: isMarketOpen() });
});

// Manuel yedek tetikle (test icin)
app.get('/api/backup-now', async (req, res) => {
  await sendTelegramBackup();
  res.json({ ok: true });
});

// Excel/CSV export
app.get('/api/export', async (req, res) => {
  try {
    const kur = await getDolarKuru();
    const result = await pool.query(`
      SELECT m.hesap_no, m.isim, m.varlik, m.bugun_kar, m.bugun_yuzde, m.acik_pozisyon,
             m.kapali_pozisyon, m.buyukluk, m.toplam_yuzde, m.son_guncelleme,
             k.baslangic_parasi, k.hakedis_miktari, k.komisyon_orani, k.para_birimi, k.es_dost, k.aktif, k.created_at,
             k.rdp_ip, k.rdp_kullanici, k.rdp_sifre
      FROM musteri_kayit k
      LEFT JOIN musteriler m ON k.hesap_no = m.hesap_no
      ORDER BY COALESCE(m.varlik, 0) DESC
    `);
    const rows = result.rows;
    const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

    function calcKom(c) {
      if (!c.baslangic_parasi || c.es_dost) return 0;
      const varlik = parseFloat(c.varlik) || 0;
      const baslangic = parseFloat(c.baslangic_parasi) || 0;
      const oran = (parseFloat(c.komisyon_orani) || 0) / 100;
      if (c.para_birimi === 'USD') return (varlik / kur - baslangic) * oran * kur;
      return (varlik - baslangic) * oran;
    }

    const headers = ['Hesap No','Isim','Para Birimi','Varlik','Baslangic Parasi','Hakedis','Komisyon Orani %','Komisyon TL','Bugun Kar','Bugun %','Acik Pozisyon','Es Dost','Aktif','Sozlesme','Son Guncelleme','Kayit Tarihi','RDP IP','RDP Kullanici','RDP Sifre'];
    const csvRows = rows.map(c => {
      const komisyon = calcKom(c);
      return [
        c.hesap_no, c.isim||'', c.para_birimi||'TL',
        c.varlik||'', c.baslangic_parasi||'', c.hakedis_miktari||'', c.komisyon_orani||'',
        komisyon > 0 ? Math.round(komisyon) : '',
        c.bugun_kar||'', c.bugun_yuzde||'', c.acik_pozisyon||'',
        c.es_dost ? 'Evet' : 'Hayir',
        c.aktif !== false ? 'Evet' : 'Hayir',
        c.son_guncelleme ? new Date(c.son_guncelleme).toLocaleString('tr-TR') : '',
        c.created_at ? new Date(c.created_at).toLocaleString('tr-TR') : '',
        c.sozlesme_link||'', c.rdp_ip||'', c.rdp_kullanici||'', c.rdp_sifre||''
      ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
    });

    const totalVarlik = rows.reduce((s, c) => s + (parseFloat(c.varlik) || 0), 0);
    const totalKomisyon = rows.reduce((s, c) => s + calcKom(c), 0);

    const summary = [
      '', '"OZET"',
      '"Toplam Musteri","' + rows.length + '"',
      '"Toplam Varlik","' + Math.round(totalVarlik) + '"',
      '"Toplam Komisyon (TL)","' + Math.round(totalKomisyon) + '"',
      '"Dolar Kuru","' + kur.toFixed(2) + '"',
      '"Rapor Tarihi","' + now + '"'
    ];

    const csv = '\uFEFF' + headers.map(h => '"'+h+'"').join(',') + '\n' + csvRows.join('\n') + '\n' + summary.join('\n');
    const filename = 'musteri_raporu_' + new Date().toISOString().slice(0,10) + '.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => { res.send(getMainPage()); });
app.get('/musteriler', (req, res) => { res.send(getCustomersPage()); });
app.get('/robot', (req, res) => { res.send(getRobotPage()); });
// Grafik uyarısı - MQL5'ten gelir
app.post('/api/grafik-uyari', async (req, res) => {
  try {
    const { hesap_no, isim, mesaj, durum } = req.body;
    if (!hesap_no || !durum) return res.status(400).json({ error: 'eksik veri' });

    if (durum === 'hata') {
      // Aynı hesap için aktif uyarı var mı?
      const existing = await pool.query(
        "SELECT id FROM grafik_uyarilari WHERE hesap_no = $1 AND durum = 'aktif'",
        [hesap_no]
      );
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO grafik_uyarilari (hesap_no, isim, mesaj) VALUES ($1, $2, $3)',
          [hesap_no, isim, mesaj || '']
        );
      } else {
        // Mesajı güncelle
        await pool.query(
          "UPDATE grafik_uyarilari SET mesaj = $1, isim = $2 WHERE hesap_no = $3 AND durum = 'aktif'",
          [mesaj || '', isim, hesap_no]
        );
      }
    } else if (durum === 'tamam') {
      await pool.query(
        "UPDATE grafik_uyarilari SET durum = 'cozuldu', cozulme_zamani = NOW() WHERE hesap_no = $1 AND durum = 'aktif'",
        [hesap_no]
      );
      console.log('Grafik uyarisi cozuldu:', hesap_no, isim);
    }
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Aktif grafik uyarılarını listele
app.get('/api/grafik-uyarilari', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM grafik_uyarilari WHERE durum = 'aktif' ORDER BY olusma_zamani DESC"
    );
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Kopukluk bildirimi - MQL5'ten gelir
app.post('/api/kopukluk', async (req, res) => {
  try {
    const { hesap_no, isim, durum } = req.body;
    if (!hesap_no || !durum) return res.status(400).json({ error: 'eksik veri' });
    
    if (durum === 'kopuk') {
      // Zaten kopuk kaydı var mı?
      const existing = await pool.query(
        "SELECT id FROM kopukluk_bildirimleri WHERE hesap_no = $1 AND durum = 'kopuk'",
        [hesap_no]
      );
      if (existing.rows.length === 0) {
        await pool.query(
          'INSERT INTO kopukluk_bildirimleri (hesap_no, isim, durum) VALUES ($1, $2, $3)',
          [hesap_no, isim, 'kopuk']
        );
        console.log('Kopukluk kaydedildi:', hesap_no, isim);
      }
    } else if (durum === 'baglandi') {
      // Kopuk kaydını kapat
      await pool.query(
        "UPDATE kopukluk_bildirimleri SET durum = 'baglandi', baglanti_zamani = NOW() WHERE hesap_no = $1 AND durum = 'kopuk'",
        [hesap_no]
      );
      console.log('Baglanti yeniden kuruldu:', hesap_no, isim);
    }
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Aktif kopuklukları listele
app.get('/api/kopukluklar', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM kopukluk_bildirimleri WHERE durum = 'kopuk' ORDER BY kopus_zamani DESC"
    );
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Musteri sil
app.delete('/api/musteri/:hesapNo', async (req, res) => {
  try {
    const { hesapNo } = req.params;

    // Mevcut bilgileri al
    const mRes = await pool.query('SELECT m.*, k.komisyon_orani, k.para_birimi, k.es_dost, k.sozlesme_link, k.aktif FROM musteriler m LEFT JOIN musteri_kayit k ON m.hesap_no = k.hesap_no WHERE m.hesap_no = $1', [hesapNo]);
    
    // Musteriler tablosundan direkt bilgi al (JOIN olmadan)
    const mDirect = await pool.query('SELECT * FROM musteriler WHERE hesap_no = $1', [hesapNo]);
    const kDirect = await pool.query('SELECT * FROM musteri_kayit WHERE hesap_no::text = $1::text', [hesapNo]);
    
    const mRow = mDirect.rows[0] || {};
    const kRow = kDirect.rows[0] || {};
    
    await pool.query(
      'INSERT INTO ayrilanlar (hesap_no, isim, son_varlik, para_birimi, es_dost, komisyon_orani, sozlesme_link, aktif) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [hesapNo, mRow.isim||null, mRow.varlik||0, kRow.para_birimi||'TL', kRow.es_dost||false, kRow.komisyon_orani||0, kRow.sozlesme_link||null, kRow.aktif!==false]
    );
    console.log('Ayrilanlar kaydi eklendi:', hesapNo, mRow.isim);

    // Tüm tablolardan sil
    await pool.query('DELETE FROM musteriler WHERE hesap_no = $1', [hesapNo]);
    await pool.query('DELETE FROM musteri_kayit WHERE hesap_no = $1', [hesapNo]);
    await pool.query('DELETE FROM para_hareketleri WHERE hesap_no = $1', [hesapNo]);
    await pool.query('DELETE FROM kopukluk_bildirimleri WHERE hesap_no = $1', [hesapNo]);
    await pool.query('DELETE FROM grafik_uyarilari WHERE hesap_no = $1', [hesapNo]);
    
    console.log('Musteri silindi ve ayrilanlar tablosuna eklendi:', hesapNo);
    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Ayrılanlar listesi
app.get('/api/ayrilanlar', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ayrilanlar ORDER BY ayilis_tarihi DESC');
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Para hareketi bildirimi (MQL5'ten gelir)
app.post('/api/para-hareketi', async (req, res) => {
  try {
    const { hesap_no, isim, miktar, islem_turu } = req.body;
    if (!hesap_no || !miktar) return res.status(400).json({ error: 'eksik veri' });
    const result = await pool.query(
      'INSERT INTO para_hareketleri (hesap_no, isim, miktar, islem_turu) VALUES ($1, $2, $3, $4) RETURNING id',
      [hesap_no, isim, parseFloat(miktar), islem_turu]
    );
    console.log('Para hareketi alindi:', hesap_no, islem_turu, miktar);
    res.json({ ok: true, id: result.rows[0].id });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Bugun para hareketi olan hesaplar (stat filtresi icin)
app.get('/api/para-hareketleri-bugun', async (req, res) => {
  try {
    const tarih = req.query.tarih || new Date().toISOString().slice(0,10);
    const result = await pool.query(
      "SELECT DISTINCT hesap_no FROM para_hareketleri WHERE DATE(created_at AT TIME ZONE 'Europe/Istanbul') = $1",
      [tarih]
    );
    res.json(result.rows);
  } catch(err) {
    res.status(500).json([]);
  }
});

// Bekleyen para hareketleri listesi
app.get('/api/para-hareketleri', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ph.*, mk.baslangic_parasi 
       FROM para_hareketleri ph
       LEFT JOIN musteri_kayit mk ON mk.hesap_no = ph.hesap_no
       WHERE ph.durum = 'bekliyor'
       ORDER BY ph.created_at DESC`
    );
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Para hareketi onayla/reddet
app.post('/api/para-hareketi/:id/onayla', async (req, res) => {
  try {
    const { id } = req.params;
    const { onay } = req.body; // true = onayla, false = reddet

    const ph = await pool.query('SELECT * FROM para_hareketleri WHERE id = $1', [id]);
    if (ph.rows.length === 0) return res.status(404).json({ error: 'bulunamadi' });
    const h = ph.rows[0];

    if (onay) {
      // Başlangıç parasını güncelle
      const kayit = await pool.query('SELECT baslangic_parasi FROM musteri_kayit WHERE hesap_no = $1', [h.hesap_no]);
      if (kayit.rows.length > 0) {
        const mevcut = parseFloat(kayit.rows[0].baslangic_parasi) || 0;
        const yeni = mevcut + parseFloat(h.miktar); // miktar + ise ekleme, - ise çıkarma
        await pool.query('UPDATE musteri_kayit SET baslangic_parasi = $1 WHERE hesap_no = $2', [yeni, h.hesap_no]);
        console.log('Baslangic parasi guncellendi:', h.hesap_no, mevcut, '->', yeni);
      }
    }

    await pool.query("UPDATE para_hareketleri SET durum = $1 WHERE id = $2",
      [onay ? 'onaylandi' : 'reddedildi', id]);

    res.json({ ok: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Robot gunluk elle guncelle
app.post('/api/robot-gunluk/:tarih/guncelle', async (req, res) => {
  try {
    const { tarih } = req.params;
    const { gunluk_pct } = req.body;
    if (gunluk_pct === undefined) return res.status(400).json({ error: 'gunluk_pct gerekli' });

    // Onceki gunun bakiyesini bul
    const prev = await pool.query(
      'SELECT bakiye, tarih FROM robot_gunluk WHERE tarih < $1 ORDER BY tarih DESC LIMIT 1',
      [tarih]
    );
    
    // DAILY_DATA son bakiyesi - DB'de yoksa
    let prevBakiye = 301216.89; // Excel son bakiye
    if (prev.rows.length > 0) prevBakiye = parseFloat(prev.rows[0].bakiye);

    const yeniBakiye = Math.round(prevBakiye * (1 + parseFloat(gunluk_pct) / 100) * 100) / 100;

    // Guncelle veya ekle
    const existing = await pool.query('SELECT id FROM robot_gunluk WHERE tarih = $1', [tarih]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE robot_gunluk SET gunluk_pct = $1, bakiye = $2 WHERE tarih = $3',
        [gunluk_pct, yeniBakiye, tarih]
      );
    } else {
      await pool.query(
        'INSERT INTO robot_gunluk (tarih, bakiye, gunluk_pct, musteri_sayisi) VALUES ($1, $2, $3, 0)',
        [tarih, yeniBakiye, gunluk_pct]
      );
    }

    // Sonraki gunleri de guncelle (bileşik etki)
    const sonraki = await pool.query(
      'SELECT tarih, gunluk_pct FROM robot_gunluk WHERE tarih > $1 ORDER BY tarih ASC',
      [tarih]
    );
    let b = yeniBakiye;
    for (const row of sonraki.rows) {
      b = Math.round(b * (1 + parseFloat(row.gunluk_pct) / 100) * 100) / 100;
      await pool.query('UPDATE robot_gunluk SET bakiye = $1 WHERE tarih = $2', [b, row.tarih]);
    }

    console.log('Robot gunluk guncellendi:', tarih, gunluk_pct + '%', 'yeni bakiye:', yeniBakiye);
    res.json({ ok: true, bakiye: yeniBakiye });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/robot-gunluk', async (req, res) => {
  try {
    const result = await pool.query('SELECT tarih, bakiye, gunluk_pct, musteri_sayisi FROM robot_gunluk ORDER BY tarih ASC');
    res.json(result.rows);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/robot-detay', (req, res) => { res.send(getRobotDetayPage()); });

// =====================================================
// ANA SAYFA
// =====================================================
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
    .market-open{color:#90EE90}.market-closed{color:#ffcccb}
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
    .status-online{background:#22c55e}.status-offline{background:#ef4444}.status-neutral{background:#9ca3af}
    .positive{color:#0d9488}.negative{color:#dc2626}
    .highlight{background:#fef3c7!important}.es-dost{background:#e0f2fe!important}
    .refresh-btn{position:fixed;bottom:15px;right:15px;background:#1a73e8;color:#fff;border:none;width:45px;height:45px;border-radius:50%;font-size:1.2rem;cursor:pointer;box-shadow:0 4px 15px rgba(26,115,232,0.4)}
    .last-update{text-align:center;padding:6px;font-size:0.65rem;color:#888}
    .modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:100;align-items:center;justify-content:center}
    .modal.show{display:flex}
    .modal-content{background:#fff;padding:20px;border-radius:12px;max-width:95%;max-height:85%;overflow:auto;width:420px}
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
    .rdp-section{background:#f0f9ff;border-radius:8px;padding:12px;margin:10px 0}
    .rdp-divider{border:none;border-top:1px dashed #cbd5e1;margin:12px 0}
    .sifre-row{display:flex;gap:6px}
    .sifre-row input{flex:1}
    .toggle-sifre{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:0.8rem;white-space:nowrap}
    .hakodis-panel{background:#fff;margin:0 10px 6px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden}
    .hakodis-panel-header{background:#1e40af;color:#fff;padding:8px 12px;font-size:0.75rem;font-weight:600;cursor:pointer;display:flex;justify-content:space-between;align-items:center}
    .hakodis-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:1px;background:#e5e7eb}
    .hakodis-cell{background:#fff;padding:10px 12px;text-align:center}
    .hakodis-cell-full{background:#fff;padding:10px 12px;text-align:center;grid-column:1/-1;border-top:1px solid #e5e7eb}
    .hakodis-val{font-size:0.95rem;font-weight:700;color:#1a73e8}
    .hakodis-val.green{color:#16a34a}
    .hakodis-val.orange{color:#d97706}
    .hakodis-val.red{color:#dc2626}
    .hakodis-lbl{font-size:0.6rem;color:#888;margin-top:2px}
  </style>
</head>
<body>
  <div class="header">
    <h1>Musteri Takip Paneli</h1>
    <div class="market-status" id="marketStatus">Piyasa durumu yukleniyor...</div>
    <div class="header-btns">
      <a href="/musteriler" class="header-btn">👥 Musteriler</a><a href="/robot" class="header-btn">📈 Robot</a><button class="header-btn" onclick="showParaHareketleri()" id="paraHareketBtn" style="position:relative;font-family:inherit">💰 Hareketler<span id="paraHareketBadge" style="display:none;position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;align-items:center;justify-content:center;font-weight:bold">0</span></button>
      <a href="/api/export" class="header-btn">📥 Excel</a>
      <button class="header-btn" onclick="showSettings()">⚙️</button>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card"><div class="stat-value" id="totalCustomers">-</div><div class="stat-label">Musteri</div></div>
    <div class="stat-card"><div class="stat-value" id="activeCustomers">-</div><div class="stat-label">Aktif</div></div>
    <div class="stat-card"><div class="stat-value" id="totalBalance">-</div><div class="stat-label">Toplam Varlik</div></div>
    <div class="stat-card"><div class="stat-value" id="todayProfit">-</div><div class="stat-label">Bugun Kar</div></div>
    <div class="stat-card"><div class="stat-value" id="avgPct">-</div><div class="stat-label">Bugün Ort %</div></div>
  </div>

  <div class="hakodis-panel">
    <div class="hakodis-panel-header" onclick="toggleHakodis()">
      📊 Hakediş Analizi <span id="hakodisArrow">▼</span>
    </div>
    <div id="hakodisBody">
      <div class="hakodis-grid">
        <div class="hakodis-cell"><div class="hakodis-val green" id="hHazirKomisyon" style="cursor:pointer;font-size:1.1rem" title="Detay için tıkla">-</div><div class="hakodis-lbl">Hakedişe hazır komisyon</div></div>
        <div class="hakodis-cell"><div class="hakodis-val orange" id="hTumununIhtiyac" style="cursor:pointer;font-size:1.3rem;font-weight:800" title="Detay için tıkla">-</div><div class="hakodis-lbl">Herkesin hakedişe ulaşması için gereken artış</div></div>
        <div class="hakodis-cell"><div class="hakodis-val orange" id="hYuzde80Ihtiyac" style="font-size:1.3rem;font-weight:800">-</div><div class="hakodis-lbl">Müşterilerin %80'inin hakedişe ulaşması için gereken artış</div></div>
        <div style="display:none"><div id="hHazirSayi"></div><div id="hEnUzakPct"></div><div id="hEnUzakIsim"></div></div>
      </div>
    </div>
  </div>
  <div class="alerts" id="alerts"></div>
  <div class="last-update">Son: <span id="lastUpdate">-</span> | Kur: <span id="kurInfo">-</span></div>

  <div class="container">
    <div style="padding:10px 0 8px 0"><input type="text" id="mainSearch" placeholder="İsim veya hesap no ara..." oninput="filterMainTable()" style="width:100%;padding:9px 14px;border:1px solid #ddd;border-radius:20px;font-size:0.85rem;outline:none;box-sizing:border-box"></div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr><th></th><th>Isim</th><th>Varlik</th><th>Bugun</th><th>%</th><th>Acik</th><th>Kmsy</th></tr>
        </thead>
        <tbody id="customerTable">
          <tr><td colspan="7" style="text-align:center;padding:30px">Yukleniyor...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <button class="refresh-btn" onclick="loadData()">↻</button>

  <!-- Uyari Modal -->
  <div class="modal" id="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalTitle">Uyari</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <ul class="modal-list" id="modalList"></ul>
    </div>
  </div>

  <!-- Ayarlar Modal -->
  

<!-- Para Hareketleri Modal -->
<div class="modal" id="paraHareketModal" onclick="if(event.target===this)closeParaHareketModal()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center">
  <div style="background:#fff;border-radius:12px;padding:24px;max-width:520px;width:90%;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="font-size:1rem;font-weight:600">💰 Para Hareketleri</h3>
      <button onclick="closeParaHareketModal()" style="border:none;background:none;font-size:1.2rem;cursor:pointer">✕</button>
    </div>
    <div id="paraHareketListesi">Yukleniyor...</div>
  </div>
</div>

<div class="modal" id="settingsModal">
    <div class="modal-content">
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
        <hr class="rdp-divider">
        <div style="font-size:0.75rem;color:#64748b;margin-bottom:8px;font-weight:600">🖥️ Sunucu Bilgileri (opsiyonel)</div>
        <div class="rdp-section">
          <div class="form-group" style="margin-bottom:8px">
            <label>Sunucu IP:Port</label>
            <input type="text" id="newRdpIp" placeholder="185.x.x.x:3389">
          </div>
          <div class="form-group" style="margin-bottom:8px">
            <label>Kullanici Adi</label>
            <input type="text" id="newRdpKullanici" placeholder="Administrator">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label>Sifre</label>
            <div class="sifre-row">
              <input type="password" id="newRdpSifre" placeholder="••••••••">
              <button class="toggle-sifre" onclick="document.getElementById('newRdpSifre').type=document.getElementById('newRdpSifre').type==='password'?'text':'password'">👁</button>
            </div>
          </div>
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
    let majPos = 0, mean = 0, stdDev = 0;
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
      return (new Date() - new Date(lastUpdate)) / 1000 / 60 < 65;
    }
    function getMajorityPosition(data) {
      const counts = {};
      data.forEach(c => { const p = c.acik_pozisyon||0; counts[p]=(counts[p]||0)+1; });
      let max=0,maj=0;
      for (const [p,cnt] of Object.entries(counts)) { if(cnt>max){max=cnt;maj=parseInt(p);} }
      return maj;
    }
    function getStdDev(data) {
      const vals = data.map(c => parseFloat(c.bugun_yuzde)||0);
      if(!vals.length) return {mean:0,stdDev:0};
      const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
      return {mean, stdDev:Math.sqrt(vals.map(v=>Math.pow(v-mean,2)).reduce((a,b)=>a+b,0)/vals.length)};
    }
    function calcKomisyon(c) {
      if (!c.baslangic_parasi || c.es_dost) return 0;
      const varlik=parseFloat(c.varlik)||0, baslangic=parseFloat(c.baslangic_parasi)||0, oran=(parseFloat(c.komisyon_orani)||0)/100;
      if (c.para_birimi==='USD') return (varlik/DOLAR_KURU-baslangic)*oran*DOLAR_KURU;
      return (varlik-baslangic)*oran;
    }
    function showModal(title,items) {
      document.getElementById('modalTitle').textContent=title;
      document.getElementById('modalList').innerHTML=items.map(i=>'<li>'+i+'</li>').join('');
      document.getElementById('modal').classList.add('show');
    }
    function openKayitliEdit(hesap_no){
      window.location.href='/musteriler?edit='+hesap_no;
    }
    function filterMainTable(){renderMainTable(allData);}
    function showKomisyonDetay(detay,toplam){
      var fmt=function(n){return new Intl.NumberFormat('tr-TR').format(Math.round(n));};
      var rows=detay.slice().sort(function(a,b){return b.komTL-a.komTL;}).map(function(d){
        var isimHtml='<span style="cursor:pointer;color:#1a73e8;text-decoration:underline" data-hesap="'+d.hesap_no+'" onclick="closeModal();openKayitliEdit(this.dataset.hesap)">'+d.isim+'</span>';
        return '<tr><td style="padding:6px 12px">'+isimHtml+'</td><td style="padding:6px 12px;text-align:right">'+fmt(d.kar)+' TL</td><td style="padding:6px 12px;text-align:center">%'+d.oran+'</td><td style="padding:6px 12px;text-align:right;color:#f59e0b;font-weight:bold">'+fmt(d.komTL)+' TL</td></tr>';
      }).join('');
      var html='<table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:1px solid #334155"><th style="padding:6px 12px;text-align:left">Isim</th><th style="padding:6px 12px;text-align:right">Kar</th><th style="padding:6px 12px;text-align:center">Oran</th><th style="padding:6px 12px;text-align:right">Komisyon</th></tr></thead><tbody>'+rows+'</tbody><tfoot><tr style="border-top:2px solid #334155"><td colspan="3" style="padding:8px 12px;font-weight:bold">TOPLAM</td><td style="padding:8px 12px;text-align:right;color:#f59e0b;font-weight:bold;font-size:1.1em">'+fmt(toplam)+' TL</td></tr></tfoot></table>';
      document.getElementById('modalTitle').textContent='Hakedise Hazir Komisyon Detayi';
      document.getElementById('modalList').innerHTML=html;
      document.getElementById('modal').classList.add('show');
    }
    function closeModal(){document.getElementById('modal').classList.remove('show');}
    function showSettings(){document.getElementById('settingsModal').classList.add('show');loadKayitli();}
    function closeSettings(){document.getElementById('settingsModal').classList.remove('show');}
    function showTab(tab,event){
      document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
      if(event&&event.target)event.target.classList.add('active');
      document.getElementById('tabAdd').style.display=tab==='add'?'block':'none';
      document.getElementById('tabList').style.display=tab==='list'?'block':'none';
      if(tab==='list')loadKayitli();
    }
    async function loadKayitli() {
      const res=await fetch('/api/kayitli');
      kayitliData=await res.json();
      document.getElementById('customerListSettings').innerHTML=kayitliData.map(k=>
        '<div style="padding:8px;border-bottom:1px solid #eee;font-size:0.8rem">'+
        '<strong>#'+k.hesap_no+'</strong> - '+(k.es_dost?'Es-Dost':'%'+k.komisyon_orani+' '+k.para_birimi)+
        '<br><small>Baslangic: '+formatMoney(k.baslangic_parasi)+(k.para_birimi==='USD'?' USD':' TL')+'</small>'+
        (k.rdp_ip?'<br><small style="color:#1a73e8">🖥️ '+k.rdp_ip+'</small>':'')+
        '</div>'
      ).join('');
    }
    async function addCustomer() {
      const data={
        hesap_no:document.getElementById('newHesapNo').value,
        baslangic_parasi:document.getElementById('newBaslangic').value,
        hakedis_miktari:document.getElementById('newBaslangic').value,
        komisyon_orani:document.getElementById('newKomisyon').value,
        para_birimi:document.getElementById('newParaBirimi').value,
        es_dost:document.getElementById('newEsDost').checked,
        rdp_ip:document.getElementById('newRdpIp').value||null,
        rdp_kullanici:document.getElementById('newRdpKullanici').value||null,
        rdp_sifre:document.getElementById('newRdpSifre').value||null
      };
      if(!data.hesap_no||!data.baslangic_parasi){alert('Hesap No ve Baslangic Parasi zorunlu');return;}
      const res=await fetch('/api/kayit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
      if(res.ok){alert('Eklendi!');closeSettings();loadData();}else alert('Hata!');
    }

    function toggleHakodis(){
      var body=document.getElementById('hakodisBody');
      var arrow=document.getElementById('hakodisArrow');
      if(body.style.display==='none'){body.style.display='block';arrow.textContent='▼';}
      else{body.style.display='none';arrow.textContent='►';}
    }

    function updateHakodisPanel(liveData, kayitliList) {
      var kayitliMap={};
      kayitliList.forEach(function(k){kayitliMap[k.hesap_no]=k;});
      var musteriler=liveData.map(function(m){
        var k=kayitliMap[m.hesap_no]||{};
        return {isim:m.isim||('#'+m.hesap_no),hesap_no:m.hesap_no,varlik:parseFloat(m.varlik)||0,hakedis:parseFloat(k.baslangic_parasi)||0,komisyon_orani:parseFloat(k.komisyon_orani)||25,es_dost:k.es_dost||false,para_birimi:k.para_birimi||'TL'};
      }).filter(function(m){return m.hakedis>0&&m.varlik>0;});
      var hazirlar=musteriler.filter(function(m){return m.varlik>=m.hakedis;});
      var hazirDetay=[];
      var hazirKomisyon=hazirlar.reduce(function(s,m){if(m.es_dost)return s;var kar=m.para_birimi==='USD'?m.varlik-(m.hakedis*DOLAR_KURU):m.varlik-m.hakedis;if(kar<=0)return s;var komTL=kar*(m.komisyon_orani/100);hazirDetay.push({isim:m.isim,hesap_no:m.hesap_no,kar:kar,oran:m.komisyon_orani,komTL:komTL});return s+komTL;},0);
      var hazirDegil=musteriler.filter(function(m){return m.varlik<m.hakedis;});
      var ihtiyaclar=hazirDegil.map(function(m){return {isim:m.isim,ihtiyac:m.hakedis-m.varlik,pct:((m.hakedis-m.varlik)/m.varlik)*100};}).sort(function(a,b){return b.pct-a.pct;});
      var sirali=[].concat(ihtiyaclar).sort(function(a,b){return a.pct-b.pct;});
      var hedef80=Math.ceil(hazirDegil.length*0.8);
      var kisi80=sirali[hedef80-1];
      var enUzak=ihtiyaclar[0];
      document.getElementById('hHazirKomisyon').textContent=formatMoney(hazirKomisyon)+' TL';
      document.getElementById('hHazirKomisyon').style.cursor='pointer';
      document.getElementById('hHazirKomisyon').onclick=function(){showKomisyonDetay(hazirDetay,hazirKomisyon);};
      document.getElementById('hHazirSayi').textContent=hazirlar.length+' kisi';
      if(enUzak){
        document.getElementById('hTumununIhtiyac').textContent='%'+enUzak.pct.toFixed(1);
        document.getElementById('hTumununIhtiyac').onclick=function(){showModal('En Uzak Kişi - '+enUzak.isim,['Hakedişe ulaşmak için %'+enUzak.pct.toFixed(1)+' artış gerekiyor']);};
      } else {
        document.getElementById('hTumununIhtiyac').textContent='Herkes hakedis ustunde';
        document.getElementById('hTumununIhtiyac').style.color='#16a34a';
      }
      if(kisi80){
        document.getElementById('hYuzde80Ihtiyac').textContent='%'+kisi80.pct.toFixed(1);
      } else {
        document.getElementById('hYuzde80Ihtiyac').textContent='%80 zaten hakedis ustunde';
        document.getElementById('hYuzde80Ihtiyac').style.color='#16a34a';
      }
      if(enUzak){
        document.getElementById('hEnUzakPct').textContent='%'+enUzak.pct.toFixed(1)+' artis';
        document.getElementById('hEnUzakIsim').textContent=enUzak.isim;
        document.getElementById('hEnUzakIsim').onclick=function(){showModal('En Uzak Kişi',['Hakedişe ulaşmak için %'+enUzak.pct.toFixed(1)+' artış gerekiyor']);}
      } else {
        document.getElementById('hEnUzakPct').textContent='-';
        document.getElementById('hEnUzakIsim').textContent='Herkes hazir!';
        document.getElementById('hEnUzakIsim').style.color='#16a34a';
      }
    }

    async function loadData() {
      try {
        const [dataRes,kurRes,kayitliRes]=await Promise.all([fetch('/api/musteriler'),fetch('/api/kur'),fetch('/api/kayitli')]);
        allData=await dataRes.json();
        const kurData=await kurRes.json();
        kayitliData=await kayitliRes.json();
        DOLAR_KURU=kurData.kur||43;
        MARKET_OPEN=kurData.marketOpen;
        const msEl=document.getElementById('marketStatus');
        msEl.innerHTML=MARKET_OPEN?'<span class="market-open">● Piyasa Acik</span> | $1 = '+DOLAR_KURU.toFixed(2)+' TL':'<span class="market-closed">● Piyasa Kapali</span> | $1 = '+DOLAR_KURU.toFixed(2)+' TL';
        const activeCount=allData.filter(c=>isActive(c.son_guncelleme)).length;
        const totalBalance=allData.reduce((s,c)=>s+(parseFloat(c.varlik)||0),0);
        // Para hareketi olan hesaplari bugunku ortalamadan cikar
        let hareketliHesaplar=new Set();
        try{
          const today=new Date().toISOString().slice(0,10);
          const hr=await fetch('/api/para-hareketleri-bugun?tarih='+today);
          const hd=await hr.json();
          hd.forEach(h=>hareketliHesaplar.add(String(h.hesap_no)));
        }catch(e){}
        // Kopukluk ve grafik uyarilarini cek (global degiskenleri de guncelle)
        try{
          const [kr,gr]=await Promise.all([fetch('/api/kopukluklar'),fetch('/api/grafik-uyarilari')]);
          _kopuklukData=await kr.json();
          _grafikData=await gr.json();
        }catch(e){}
        var kopuklukData=_kopuklukData;
        var kopData=_kopuklukData;
        var grafData=_grafikData;
        var grafikData=_grafikData;
        const filteredData=allData.filter(c=>!hareketliHesaplar.has(String(c.hesap_no)));
        const todayProfit=filteredData.reduce((s,c)=>s+(parseFloat(c.bugun_kar)||0),0);
        const avgPct=filteredData.length>0?filteredData.reduce((s,c)=>s+(parseFloat(c.bugun_yuzde)||0),0)/filteredData.length:0;
        const totalKomisyon=allData.reduce((s,c)=>s+calcKomisyon(c),0);
        document.getElementById('totalCustomers').textContent=allData.length+'/'+kayitliData.filter(k=>k.aktif!==false).length;
        document.getElementById('activeCustomers').textContent=MARKET_OPEN?activeCount:'-';
        document.getElementById('totalBalance').textContent=formatMoney(totalBalance);
        document.getElementById('todayProfit').textContent=(todayProfit>=0?'+':'')+formatMoney(todayProfit);
        document.getElementById('todayProfit').className='stat-value '+(todayProfit>=0?'positive':'negative');
        document.getElementById('avgPct').textContent=(avgPct>=0?'+':'')+avgPct.toFixed(2)+'%';
        document.getElementById('avgPct').className='stat-value '+(avgPct>=0?'positive':'negative');
        document.getElementById('lastUpdate').textContent=new Date().toLocaleString('tr-TR');
        updateHakodisPanel(allData, kayitliData);
        document.getElementById('kurInfo').textContent='$1 = '+DOLAR_KURU.toFixed(2)+' TL';
        majPos=getMajorityPosition(allData);
        const posIssues=allData.filter(c=>(c.acik_pozisyon||0)!==majPos);
        ({mean,stdDev}=getStdDev(allData));
        const outliers=allData.filter(c=>Math.abs((parseFloat(c.bugun_yuzde)||0)-mean)>stdDev*2);
        const gelenIDs=allData.map(m=>m.hesap_no);
        const gelmeyenler=kayitliData.filter(k=>k.aktif!==false&&!gelenIDs.includes(k.hesap_no));
        let alertsHtml='';
        if(MARKET_OPEN){
          const inactiveList=allData.filter(c=>!isActive(c.son_guncelleme));
          if(gelmeyenler.length>0)alertsHtml+='<button class="alert-btn danger" onclick="showGelmeyenler()">🚨 Veri Yok: '+gelmeyenler.length+'</button>';
          if(inactiveList.length>0)alertsHtml+='<button class="alert-btn danger" onclick="showInactive()">⚠ Pasif: '+inactiveList.length+'</button>';
          if(posIssues.length>0)alertsHtml+='<button class="alert-btn warning" onclick="showPosIssues()">📊 Poz: '+posIssues.length+'</button>';
          if(outliers.length>0)alertsHtml+='<button class="alert-btn warning" onclick="showOutliers()">📈 Sapma: '+outliers.length+'</button>';
          if(kopData.length>0)alertsHtml+=\'<button class="alert-btn danger" onclick="showKopuklukModal()">🔴 Kopuk: \'+kopData.length+\'</button>\';
          if(grafData.length>0)alertsHtml+=\'<button class="alert-btn warning" onclick="showGrafikModal()">📊 Grafik: \'+grafData.length+\'</button>\';
          if(alertsHtml==='')alertsHtml='<button class="alert-btn success">✓ Normal</button>';
        }else{
          alertsHtml='<button class="alert-btn info">🌙 Piyasa Kapali - Kontrol Pasif</button>';
          if(posIssues.length>0)alertsHtml+='<button class="alert-btn warning" onclick="showPosIssues()">📊 Poz: '+posIssues.length+'</button>';
          if(outliers.length>0)alertsHtml+='<button class="alert-btn warning" onclick="showOutliers()">📈 Sapma: '+outliers.length+'</button>';
          if(kopData.length>0)alertsHtml+=\'<button class="alert-btn danger" onclick="showKopuklukModal()">🔴 Kopuk: \'+kopData.length+\'</button>\';
          if(grafData.length>0)alertsHtml+=\'<button class="alert-btn warning" onclick="showGrafikModal()">📊 Grafik: \'+grafData.length+\'</button>\';
        }
        document.getElementById('alerts').innerHTML=alertsHtml;
        renderMainTable(allData);
      } catch(err){console.error(err);}
    }
    function renderMainTable(data){
        var q=(document.getElementById('mainSearch')||{value:''}).value.toLowerCase();
        var filtered=q?data.filter(function(c){return (c.isim||'').toLowerCase().includes(q)||(c.hesap_no||'').toString().includes(q);}):data;
        const tbody=document.getElementById('customerTable');
        if(filtered.length===0){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px">Sonuç bulunamadı</td></tr>';return;}
        tbody.innerHTML=filtered.map(c=>{
          const active=isActive(c.son_guncelleme);
          const bugunKar=parseFloat(c.bugun_kar)||0;
          const bugunPct=parseFloat(c.bugun_yuzde)||0;
          const posIssue=(c.acik_pozisyon||0)!==majPos;
          const isOutlier=Math.abs(bugunPct-mean)>stdDev*2;
          const komisyon=calcKomisyon(c);
          let rowClass=c.es_dost?'es-dost':(posIssue||isOutlier)?'highlight':'';
          let statusClass=!MARKET_OPEN?'status-neutral':active?'status-online':'status-offline';
          return '<tr class="'+rowClass+'">'+
            '<td><span class="status-dot '+statusClass+'"></span></td>'+
            '<td>'+(c.isim||'-')+'<br><small style="color:#888">#'+c.hesap_no+'</small></td>'+
            '<td>'+formatMoney(c.varlik)+'</td>'+
            '<td class="'+(bugunKar>=0?'positive':'negative')+'">'+(bugunKar>=0?'+':'')+formatMoney(bugunKar)+'</td>'+
            '<td class="'+(bugunPct>=0?'positive':'negative')+'">'+(bugunPct>=0?'+':'')+bugunPct.toFixed(1)+'%</td>'+
            '<td>'+(c.acik_pozisyon||0)+'</td>'+
            '<td class="'+(komisyon>=0?'positive':'negative')+'">'+(c.es_dost?'-':formatMoney(komisyon))+'</td>'+
          '</tr>';
        }).join('');
    }
    function showInactive(){showModal('Pasif (65+ dk)',allData.filter(c=>!isActive(c.son_guncelleme)).map(c=>(c.isim||'-')+' (#'+c.hesap_no+')'));}
    function showPosIssues(){const maj=getMajorityPosition(allData);showModal('Pozisyon Farki',allData.filter(c=>(c.acik_pozisyon||0)!==maj).map(c=>(c.isim||'-')+' - Acik: '+(c.acik_pozisyon||0)+' (gereken: '+maj+')'));}
    function showOutliers(){const {mean}=getStdDev(allData);showModal('Kar Sapmasi',allData.filter(c=>Math.abs((parseFloat(c.bugun_yuzde)||0)-mean)>getStdDev(allData).stdDev*2).map(c=>(c.isim||'-')+' - '+(parseFloat(c.bugun_yuzde)||0).toFixed(2)+'% (ort: '+mean.toFixed(2)+'%)'));}
    function showGelmeyenler(){const gelenIDs=allData.map(m=>m.hesap_no);showModal('Veri Gelmeyen Musteriler',kayitliData.filter(k=>k.aktif!==false&&!gelenIDs.includes(k.hesap_no)).map(k=>'#'+k.hesap_no));}
    loadData();
    setInterval(loadData,30000);
    setInterval(loadParaHareketleri, 30000);
    loadParaHareketleri();
  
// ===== KOPUKLUK & GRAFİK DETAY MODALLERİ =====
var _kopuklukData=[];
var _grafikData=[];

function showKopuklukDetay(){
  var html='<div style="padding:4px 0">';
  _kopuklukData.forEach(function(k){
    var sure=Math.round((Date.now()-new Date(k.kopus_zamani).getTime())/60000);
    html+='<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #fee2e2">'
         +'<span style="font-size:1.2rem">🔴</span>'
         +'<div><div style="font-weight:600;font-size:0.88rem">'+(k.isim||k.hesap_no)+'</div>'
         +'<div style="font-size:0.75rem;color:#888">Hesap: '+k.hesap_no+' &nbsp;|&nbsp; '+sure+' dakikadır kopuk</div>'
         +'<div style="font-size:0.72rem;color:#dc2626;margin-top:2px">Kopuş: '+new Date(k.kopus_zamani).toLocaleString("tr-TR")+'</div>'
         +'</div></div>';
  });
  html+='</div>';
  showAlertModal('🔴 Bağlantı Kopuk Hesaplar', html);
}

function showGrafikDetay(){
  var html='<div style="padding:4px 0">';
  _grafikData.forEach(function(g){
    var sure=Math.round((Date.now()-new Date(g.olusma_zamani).getTime())/60000);
    html+='<div style="display:flex;align-items:start;gap:10px;padding:10px 0;border-bottom:1px solid #fef3c7">'
         +'<span style="font-size:1.2rem">🟡</span>'
         +'<div><div style="font-weight:600;font-size:0.88rem">'+(g.isim||g.hesap_no)+'</div>'
         +'<div style="font-size:0.75rem;color:#888">Hesap: '+g.hesap_no+' &nbsp;|&nbsp; '+sure+' dakikadır hatalı</div>'
         +'<div style="font-size:0.72rem;color:#92400e;margin-top:4px;background:#fef3c7;padding:4px 8px;border-radius:4px">'+(g.mesaj||'-')+'</div>'
         +'</div></div>';
  });
  html+='</div>';
  showAlertModal('📊 Grafik Hatası Olan Hesaplar', html);
}

function showKopuklukModal(){
  if(!_kopuklukData||_kopuklukData.length===0)return;
  var html='';
  _kopuklukData.forEach(function(k){
    var sure=Math.round((Date.now()-new Date(k.kopus_zamani).getTime())/60000);
    html+='<div style="padding:10px 0;border-bottom:1px solid #f0f0f0">'
         +'<div style="font-weight:600;color:#dc2626">🔴 '+(k.isim||k.hesap_no)+'</div>'
         +'<div style="font-size:0.78rem;color:#888;margin-top:3px">Hesap: '+k.hesap_no+' &nbsp;|&nbsp; '+sure+' dakikadır kopuk</div>'
         +'<div style="font-size:0.75rem;color:#aaa;margin-top:2px">'+new Date(k.kopus_zamani).toLocaleString("tr-TR")+'</div>'
         +'</div>';
  });
  showAlertModal('🔴 Bağlantı Kopuk ('+_kopuklukData.length+')', html);
}

function showGrafikModal(){
  if(!_grafikData||_grafikData.length===0)return;
  var html='';
  _grafikData.forEach(function(g){
    var sure=Math.round((Date.now()-new Date(g.olusma_zamani).getTime())/60000);
    html+='<div style="padding:10px 0;border-bottom:1px solid #f0f0f0">'
         +'<div style="font-weight:600;color:#d97706">📊 '+(g.isim||g.hesap_no)+'</div>'
         +'<div style="font-size:0.78rem;color:#555;margin-top:4px;white-space:pre-wrap">'+(g.mesaj||'').replace(/</g,"&lt;")+'</div>'
         +'<div style="font-size:0.75rem;color:#aaa;margin-top:4px">'+sure+' dakikadır | '+new Date(g.olusma_zamani).toLocaleString("tr-TR")+'</div>'
         +'</div>';
  });
  showAlertModal('📊 Grafik Hatası ('+_grafikData.length+')', html);
}

function showAlertModal(title, content){
  var m=document.getElementById('alertDetailModal');
  if(!m){
    m=document.createElement('div');
    m.id='alertDetailModal';
    m.style.cssText='display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center';
    m.onclick=function(e){if(e.target===m)m.style.display='none';};
    var inner=document.createElement('div');
    inner.style.cssText='background:#fff;border-radius:12px;padding:0;max-width:480px;width:92%;max-height:80vh;overflow:hidden;display:flex;flex-direction:column';
    var hdr=document.createElement('div');
    hdr.style.cssText='padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center';
    var ttl=document.createElement('h3');
    ttl.id='alertDetailTitle';
    ttl.style.cssText='font-size:0.95rem;font-weight:600;margin:0';
    var cls=document.createElement('button');
    cls.innerHTML='&times;';
    cls.style.cssText='background:none;border:none;font-size:1.2rem;cursor:pointer;color:#aaa';
    cls.onclick=function(){m.style.display='none';};
    hdr.appendChild(ttl);
    hdr.appendChild(cls);
    var body=document.createElement('div');
    body.id='alertDetailContent';
    body.style.cssText='padding:16px 20px;overflow-y:auto';
    inner.appendChild(hdr);
    inner.appendChild(body);
    m.appendChild(inner);
    document.body.appendChild(m);
  }
  document.getElementById('alertDetailTitle').textContent=title;
  document.getElementById('alertDetailContent').innerHTML=content;
  m.style.display='flex';
}

async function loadKopukluklar(){
  try{
    const [kopRes, grafRes] = await Promise.all([
      fetch('/api/kopukluklar'),
      fetch('/api/grafik-uyarilari')
    ]);
    _kopuklukData = await kopRes.json();
    _grafikData = await grafRes.json();
  }catch(e){}
}

// ===== PARA HAREKETLERİ =====
async function loadParaHareketleri(){
  try{
    const r = await fetch('/api/para-hareketleri');
    const data = await r.json();
    
    // Badge güncelle
    const badge = document.getElementById('paraHareketBadge');
    if(data.length > 0){
      badge.textContent = data.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
    return data;
  }catch(e){ return []; }
}

async function showParaHareketleri(){
  document.getElementById('paraHareketModal').style.display = 'flex';
  const liste = document.getElementById('paraHareketListesi');
  liste.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Yukleniyor...</div>';
  
  const data = await loadParaHareketleri();
  
  if(data.length === 0){
    liste.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Bekleyen hareket yok</div>';
    return;
  }
  
  let html = '';
  data.forEach(h => {
    const miktar = parseFloat(h.miktar);
    const isEkleme = miktar > 0;
    const tur = isEkleme ? 'Para Yatirma' : 'Para Cekme';
    const renk = isEkleme ? '#16a34a' : '#dc2626';
    const icon = isEkleme ? '📈' : '📉';
    const mevcutBas = parseFloat(h.baslangic_parasi)||0;
    const yeniBas = mevcutBas + miktar;
    const tarih = new Date(h.created_at).toLocaleString('tr-TR');
    
    html += '<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:10px">'
          +'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">'
          +'<div><div style="font-weight:600;font-size:0.9rem">'+icon+' '+(h.isim||h.hesap_no)+'</div>'
          +'<div style="font-size:0.75rem;color:#888;margin-top:2px">'+h.hesap_no+' &middot; '+tarih+'</div></div>'
          +'<div style="text-align:right"><div style="font-weight:700;font-size:1rem;color:'+renk+'">'+(isEkleme?'+':'')
          +new Intl.NumberFormat('tr-TR').format(Math.round(miktar))+' TL</div>'
          +'<div style="font-size:0.7rem;color:#888">'+tur+'</div></div></div>'
          +'<div style="background:#f8fafc;border-radius:6px;padding:8px;font-size:0.75rem;margin-bottom:10px">'
          +'<div style="display:flex;justify-content:space-between"><span style="color:#666">Mevcut baslangic:</span>'
          +'<span style="font-weight:600">'+new Intl.NumberFormat('tr-TR').format(Math.round(mevcutBas))+' TL</span></div>'
          +'<div style="display:flex;justify-content:space-between;margin-top:4px"><span style="color:#666">Onaylanirsa yeni:</span>'
          +'<span style="font-weight:600;color:'+renk+'">'+new Intl.NumberFormat('tr-TR').format(Math.round(yeniBas))+' TL</span></div></div>'
          +'<div style="display:flex;gap:8px">'
          +'<button onclick="onaylaHareket('+h.id+', true, this)" style="flex:1;padding:7px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem;font-weight:600">✅ Onayla ve Baslangic Parasini Guncelle</button>'
          +'<button onclick="onaylaHareket('+h.id+', false, this)" style="flex:0 0 auto;padding:7px 14px;background:#f3f4f6;color:#666;border:none;border-radius:6px;cursor:pointer;font-size:0.8rem">✕ Reddet</button>'
          +'</div></div>';
  });
  
  liste.innerHTML = html;
}

async function onaylaHareket(id, onay, btn){
  btn.disabled = true;
  btn.textContent = 'Isleniyor...';
  try{
    const r = await fetch('/api/para-hareketi/'+id+'/onayla', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({onay})
    });
    const d = await r.json();
    if(d.ok){
      // Kartı kaldır
      btn.closest('div[style*="border:1px"]').remove();
      // Eğer liste boşaldıysa
      const liste = document.getElementById('paraHareketListesi');
      if(!liste.querySelector('div[style*="border:1px"]')){
        liste.innerHTML = '<div style="text-align:center;padding:20px;color:#888">Bekleyen hareket yok</div>';
      }
      await loadParaHareketleri();
      if(onay) loadData(); // ana tabloyu yenile
    }
  }catch(e){ btn.disabled=false; btn.textContent='Hata'; }
}

function closeParaHareketModal(){
  document.getElementById('paraHareketModal').style.display = 'none';
}

</script>
</body>
</html>`;
}

// =====================================================
// MUSTERILER SAYFASI
// =====================================================
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
    .rdp-row{display:flex;gap:4px;margin-top:8px}
    .rdp-btn{flex:1;padding:5px 6px;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.7rem;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
    .rdp-ip{background:#0ea5e9}
    .rdp-user{background:#0ea5e9}
    .rdp-pass{background:#7c3aed}
    .rdp-btn:hover{background:#0284c7}
    .positive{color:#0d9488}.negative{color:#dc2626}
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
    .btn-primary{background:#1a73e8;color:#fff}.btn-primary:hover{background:#1557b0}
    .btn-secondary{background:#f1f5f9;color:#374151}.btn-secondary:hover{background:#e2e8f0}
    .no-data{text-align:center;padding:40px 20px;color:#94a3b8}
    .rdp-section{background:#f0f9ff;border-radius:8px;padding:12px;margin-top:4px;border:1px solid #bae6fd}
    .rdp-divider{border:none;border-top:1px dashed #cbd5e1;margin:14px 0}
    .sifre-row{display:flex;gap:6px;align-items:center}
    .sifre-row input{flex:1}
    .toggle-sifre{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;cursor:pointer;font-size:0.8rem;white-space:nowrap}
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="back-btn">← Geri</a>
    <h1>Musteriler</h1>
    <a href="/api/export" class="back-btn">📥 Excel</a>
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
    <button class="filter-btn" onclick="setFilter('sozlesmesiz', this)">Sozlesmesiz <span class="count-badge" id="countSozlesmesiz">0</span></button>
    <button class="filter-btn" style="background:#fef3c7;color:#92400e;border-color:#fcd34d;margin-left:8px" onclick="showAyrilanlar()">👋 Ayrilanlar</button>
  </div>

  <div class="customer-grid" id="customerGrid">
    <div class="no-data">Yukleniyor...</div>
  </div>

  <!-- Edit Modal -->
  <div class="modal" id="editModal" onclick="handleModalBackdrop(event)">
    <div class="modal-sheet" id="editSheet">
      <div class="modal-handle"></div>
      <div class="modal-title" id="editTitle">Musteri Duzenle</div>
      <div class="modal-subtitle" id="editSubtitle"></div>

      <div class="section-title">📊 Canli Veriler (MQL)</div>
      <div class="info-row"><span class="info-label">Son Varlik</span><span class="info-value" id="infoVarlik">-</span></div>
      <div class="info-row"><span class="info-label">Bugun Kar/Zarar</span><span class="info-value" id="infoBugunKar">-</span></div>
      <div class="info-row"><span class="info-label">Bugun %</span><span class="info-value" id="infoBugunPct">-</span></div>
      <div class="info-row"><span class="info-label">Acik Pozisyon</span><span class="info-value" id="infoAcikPoz">-</span></div>
      <div class="info-row"><span class="info-label">Son Guncelleme</span><span class="info-value" id="infoSonGun">-</span></div>

      <div class="section-title">✏️ Kayit Bilgileri</div>
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

      <!-- RDP Bolumu -->
      <hr class="rdp-divider">
      <div class="section-title">🖥️ Sunucu Bilgileri (RDP)</div>
      <div class="rdp-section">
        <div class="form-group" style="margin-bottom:10px">
          <label>Sunucu IP:Port</label>
          <input type="text" id="editRdpIp" placeholder="185.x.x.x:3389">
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label>Kullanici Adi</label>
          <input type="text" id="editRdpKullanici" placeholder="Administrator">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>Sifre</label>
          <div class="sifre-row">
            <input type="password" id="editRdpSifre" placeholder="••••••••">
            <button class="toggle-sifre" onclick="toggleSifre()">👁</button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>📄 Sözleşme Linki (Google Drive)</label>
        <div style="display:flex;gap:6px;align-items:center">
          <input type="text" id="editSozlesme" placeholder="https://drive.google.com/..." style="flex:1">
          <a id="sozlesmeAc" href="#" target="_blank" style="display:none;background:#16a34a;color:#fff;border:none;padding:7px 10px;border-radius:6px;font-size:0.8rem;text-decoration:none;white-space:nowrap">📄 Aç</a>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" onclick="closeEditModal()">Iptal</button>
        <button class="btn btn-primary" onclick="saveCustomer()">💾 Kaydet</button>
      </div>
    </div>
  </div>

  <script>
    let allCustomers=[], kayitliCustomers=[], currentFilter='all', DOLAR_KURU=43, MARKET_OPEN=true;

    function formatMoney(n){if(n===null||n===undefined||isNaN(n))return '0';return new Intl.NumberFormat('tr-TR').format(Math.round(n));}
    function isActive(lastUpdate){if(!MARKET_OPEN)return null;if(!lastUpdate)return false;return(new Date()-new Date(lastUpdate))/1000/60<65;}
    function calcKomisyon(c){
      if(!c.baslangic_parasi||c.es_dost)return 0;
      const varlik=parseFloat(c.varlik)||0,baslangic=parseFloat(c.baslangic_parasi)||0,oran=(parseFloat(c.komisyon_orani)||0)/100;
      if(c.para_birimi==='USD')return(varlik/DOLAR_KURU-baslangic)*oran*DOLAR_KURU;
      return(varlik-baslangic)*oran;
    }
    function toggleSifre(){const el=document.getElementById('editRdpSifre');el.type=el.type==='password'?'text':'password';}

    function makeRdpLink(c) {
      if (!c.rdp_ip) return '';
      const ip = (c.rdp_ip||'').replace(/"/g,'&quot;');
      const user = (c.rdp_kullanici||'').replace(/"/g,'&quot;');
      const sifre = (c.rdp_sifre||'').replace(/"/g,'&quot;');
      return '<div class="rdp-row" onclick="event.stopPropagation()">' +
        '<button class="rdp-btn rdp-ip" data-copy="'+ip+'" onclick="event.stopPropagation();copyText(this)">🖥️ '+c.rdp_ip+'</button>' +
        '<button class="rdp-btn rdp-user" data-copy="'+user+'" onclick="event.stopPropagation();copyText(this)">👤 '+user+'</button>' +
        '<button class="rdp-btn rdp-pass" data-copy="'+sifre+'" onclick="event.stopPropagation();copyText(this)">🔑 Sifre</button>' +
      '</div>';
    }

    function copyText(btn) {
      const text = btn.dataset.copy;
      const orig = btn.innerHTML;
      const origBg = btn.style.background;
      navigator.clipboard.writeText(text).then(() => {
        btn.innerHTML = '✅ Kopyalandi!';
        btn.style.background = '#16a34a';
        setTimeout(() => { btn.innerHTML = orig; btn.style.background = origBg; }, 1500);
      }).catch(() => { prompt('Kopyala:', text); });
    }

    function setFilter(filter,btn){currentFilter=filter;document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderCards();}
    function filterCustomers(){renderCards();}

    function getFilteredData(){
      const search=document.getElementById('searchInput').value.toLowerCase();
      if(currentFilter==='kayitsiz'){
        const gelenIDs=allCustomers.map(c=>c.hesap_no);
        return kayitliCustomers.filter(k=>!gelenIDs.includes(k.hesap_no)).filter(k=>!search||k.hesap_no.toLowerCase().includes(search));
      }
      let data=[...allCustomers];
      if(currentFilter==='sozlesmesiz')return data.filter(c=>!c.sozlesme_link);
      if(currentFilter==='active')data=data.filter(c=>isActive(c.son_guncelleme)===true);
      else if(currentFilter==='inactive')data=data.filter(c=>isActive(c.son_guncelleme)===false);
      else if(currentFilter==='esdost')data=data.filter(c=>c.es_dost);
      if(search)data=data.filter(c=>(c.isim||'').toLowerCase().includes(search)||c.hesap_no.toLowerCase().includes(search));
      return data;
    }

    function updateCounts(){
      const gelenIDs=allCustomers.map(c=>c.hesap_no);
      document.getElementById('countAll').textContent=allCustomers.length;
      document.getElementById('countActive').textContent=allCustomers.filter(c=>isActive(c.son_guncelleme)===true).length;
      document.getElementById('countInactive').textContent=allCustomers.filter(c=>isActive(c.son_guncelleme)===false).length;
      document.getElementById('countEsDost').textContent=allCustomers.filter(c=>c.es_dost).length;
      document.getElementById('countKayitsiz').textContent=kayitliCustomers.filter(k=>!gelenIDs.includes(k.hesap_no)).length;
      document.getElementById('countSozlesmesiz').textContent=allCustomers.filter(c=>!c.sozlesme_link).length;
    }

    let cardDataMap = {};

    function renderCards(){
      const data=getFilteredData();
      const grid=document.getElementById('customerGrid');
      if(data.length===0){grid.innerHTML='<div class="no-data">Musteri bulunamadi</div>';return;}
      cardDataMap={};
      grid.innerHTML=data.map((c,i)=>{
        cardDataMap[i]=c;
        const active=isActive(c.son_guncelleme);
        const bugunKar=parseFloat(c.bugun_kar)||0;
        const bugunPct=parseFloat(c.bugun_yuzde)||0;
        const komisyon=calcKomisyon(c);
        let cardClass='customer-card';
        let statusText='';
        if(c.es_dost){cardClass+=' es-dost';statusText='Es-Dost';}
        else if(active===true){cardClass+=' active';statusText='Aktif';}
        else if(active===false){cardClass+=' inactive';statusText='Pasif';}
        else{cardClass+=' neutral';statusText='Piyasa Kapali';}
        if(!c.varlik&&c.baslangic_parasi){
          return '<div class="'+cardClass+'" onclick="openEditModal(cardDataMap['+i+'])">' +
            '<div class="card-header"><div><div class="card-name">#'+c.hesap_no+'</div><div class="card-id">Canli veri bekleniyor</div></div><span class="card-badge">Kayitli</span></div>'+
            '<div class="info-row" style="font-size:0.8rem;padding:4px 0"><span style="color:#64748b">Baslangic</span><span>'+formatMoney(c.baslangic_parasi)+' '+(c.para_birimi||'TL')+'</span></div>'+
            makeRdpLink(c)+
          '<div style="text-align:right;padding:4px 0 2px"><button data-hesap="'+c.hesap_no+'" data-isim="'+(c.isim||('#'+c.hesap_no)).replace(/"/g,'')+'" onclick="event.stopPropagation();musteriSil(this.dataset.hesap,this.dataset.isim)" style="background:none;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;padding:3px 10px;font-size:0.72rem;cursor:pointer">🗑 Sil</button></div>'+
          '</div>';
        }
        return '<div class="'+cardClass+'" onclick="openEditModal(cardDataMap['+i+'])">' +
          '<div class="card-header"><div><div class="card-name">'+(c.isim||'#'+c.hesap_no)+'</div><div class="card-id">#'+c.hesap_no+' · '+(c.para_birimi||'TL')+'</div></div>'+
          '<span class="card-badge'+(c.es_dost?' es-dost-badge':'')+'">'+statusText+'</span></div>'+
          (c.sozlesme_link ? '<a href="'+c.sozlesme_link+'" target="_blank" onclick="event.stopPropagation()" style="font-size:1rem;text-decoration:none;margin-left:4px" title="Sozlesme Var">📄</a>' : '<span style="font-size:1rem;opacity:0.35;margin-left:4px" title="Sozlesme Yok">📋</span>')+
          '<div class="card-stats">'+
            '<div class="card-stat"><div class="card-stat-value">'+formatMoney(c.varlik)+'</div><div class="card-stat-label">Varlik</div></div>'+
            '<div class="card-stat"><div class="card-stat-value '+(bugunKar>=0?'positive':'negative')+'">'+(bugunKar>=0?'+':'')+formatMoney(bugunKar)+'</div><div class="card-stat-label">Bugun</div></div>'+
            '<div class="card-stat"><div class="card-stat-value '+(komisyon>=0?'positive':'negative')+'">'+(c.es_dost?'-':formatMoney(komisyon))+'</div><div class="card-stat-label">Komisyon</div></div>'+
          '</div>'+
          '<div class="card-footer"><span>Baslangic: '+formatMoney(c.baslangic_parasi||0)+' '+(c.para_birimi||'TL')+'</span><span>%'+bugunPct.toFixed(2)+' bugun</span></div>'+
          makeRdpLink(c)+
        '<div style="text-align:right;padding:4px 0 2px"><button data-hesap="'+c.hesap_no+'" data-isim="'+(c.isim||('#'+c.hesap_no)).replace(/"/g,'')+'" onclick="event.stopPropagation();musteriSil(this.dataset.hesap,this.dataset.isim)" style="background:none;border:1px solid #fca5a5;color:#dc2626;border-radius:6px;padding:3px 10px;font-size:0.72rem;cursor:pointer">🗑 Sil</button></div>'+
        '</div>';
      }).join('');
    }

    async function showAyrilanlar(){
      var m = document.getElementById('ayrilanlarModal');
      if(!m){
        m = document.createElement('div');
        m.id = 'ayrilanlarModal';
        m.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center';
        m.onclick = function(e){if(e.target===m)m.style.display='none';};
        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border-radius:12px;width:92%;max-width:700px;max-height:85vh;overflow:hidden;display:flex;flex-direction:column';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'padding:16px 20px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;background:#fef3c7';
        hdr.innerHTML = '<h3 style="font-size:0.95rem;font-weight:700;color:#92400e;margin:0">👋 Ayrılan Müşteriler</h3>';
        var cls = document.createElement('button');
        cls.innerHTML = '&times;';
        cls.style.cssText = 'background:none;border:none;font-size:1.3rem;cursor:pointer;color:#92400e';
        cls.onclick = function(){m.style.display='none';};
        hdr.appendChild(cls);
        var body = document.createElement('div');
        body.id = 'ayrilanlarBody';
        body.style.cssText = 'overflow-y:auto;padding:0';
        box.appendChild(hdr);
        box.appendChild(body);
        m.appendChild(box);
        document.body.appendChild(m);
      }
      m.style.display = 'flex';
      document.getElementById('ayrilanlarBody').innerHTML = '<div style="padding:20px;text-align:center;color:#aaa">Yukleniyor...</div>';
      try {
        const r = await fetch('/api/ayrilanlar');
        const data = await r.json();
        if(data.length === 0){
          document.getElementById('ayrilanlarBody').innerHTML = '<div style="padding:30px;text-align:center;color:#aaa">Henuz ayrilanlar yok</div>';
          return;
        }
        var html = '<table style="width:100%;border-collapse:collapse">';
        html += '<thead><tr style="background:#f8fafc;font-size:0.75rem;color:#666">';
        html += '<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb">Isim</th>';
        html += '<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb">Son Varlik</th>';
        html += '<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb">Durum</th>';
        html += '<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb">Komisyon</th>';
        html += '<th style="padding:10px 14px;text-align:left;border-bottom:2px solid #e5e7eb">Ayilis</th>';
        html += '</tr></thead><tbody>';
        data.forEach(function(a){
          var tarih = new Date(a.ayilis_tarihi).toLocaleDateString('tr-TR');
          var durum = a.es_dost ? '<span style="background:#e0e7ff;color:#3730a3;padding:2px 7px;border-radius:10px;font-size:0.7rem">Es-Dost</span>'
                    : a.aktif ? '<span style="background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:10px;font-size:0.7rem">Aktif</span>'
                    : '<span style="background:#f1f5f9;color:#64748b;padding:2px 7px;border-radius:10px;font-size:0.7rem">Pasif</span>';
          var sozlesme = a.sozlesme_link ? '<a href="'+a.sozlesme_link+'" target="_blank" style="font-size:0.8rem">📄</a>' : '<span style="opacity:0.3">📋</span>';
          html += '<tr style="border-bottom:1px solid #f0f0f0;font-size:0.82rem">';
          html += '<td style="padding:10px 14px"><div style="font-weight:600">'+(a.isim||'#'+a.hesap_no)+'</div><div style="color:#aaa;font-size:0.72rem">#'+a.hesap_no+'</div></td>';
          html += '<td style="padding:10px 14px;font-weight:600">'+new Intl.NumberFormat('tr-TR').format(Math.round(a.son_varlik||0))+' '+(a.para_birimi||'TL')+'</td>';
          html += '<td style="padding:10px 14px">'+durum+'</td>';
          html += '<td style="padding:10px 14px">%'+(parseFloat(a.komisyon_orani)||0)+' '+sozlesme+'</td>';
          html += '<td style="padding:10px 14px;color:#888">'+tarih+'</td>';
          html += '</tr>';
        });
        html += '</tbody></table>';
        document.getElementById('ayrilanlarBody').innerHTML = html;
      } catch(e){
        document.getElementById('ayrilanlarBody').innerHTML = '<div style="padding:20px;color:#dc2626">Hata olustu</div>';
      }
    }

    function musteriSil(hesapNo, isim){
      if(!confirm(isim + ' isimli musteriyi silmek istiyor musunuz? Tum verisi silinecek!')) return;
      fetch('/api/musteri/'+hesapNo, {method:'DELETE'})
        .then(r=>r.json())
        .then(d=>{
          if(d.ok){
            alert(isim+' silindi.');
            loadData();
          } else {
            alert('Hata: '+(d.error||'bilinmeyen'));
          }
        })
        .catch(()=>alert('Bağlantı hatası'));
    }

    function openEditModal(c){
      document.getElementById('editHesapNo').value=c.hesap_no;
      document.getElementById('editTitle').textContent=c.isim||('#'+c.hesap_no);
      document.getElementById('editSubtitle').textContent='Hesap No: '+c.hesap_no;
      const bugunKar=parseFloat(c.bugun_kar)||0,bugunPct=parseFloat(c.bugun_yuzde)||0;
      document.getElementById('infoVarlik').textContent=c.varlik?formatMoney(c.varlik)+' '+(c.para_birimi||'TL'):'Veri yok';
      document.getElementById('infoBugunKar').innerHTML=c.bugun_kar!==undefined?'<span class="'+(bugunKar>=0?'positive':'negative')+'">'+(bugunKar>=0?'+':'')+formatMoney(bugunKar)+'</span>':'-';
      document.getElementById('infoBugunPct').innerHTML=c.bugun_yuzde!==undefined?'<span class="'+(bugunPct>=0?'positive':'negative')+'">'+(bugunPct>=0?'+':'')+bugunPct.toFixed(2)+'%</span>':'-';
      document.getElementById('infoAcikPoz').textContent=c.acik_pozisyon!==undefined?c.acik_pozisyon:'-';
      document.getElementById('infoSonGun').textContent=c.son_guncelleme?new Date(c.son_guncelleme).toLocaleString('tr-TR'):'Veri gelmedi';
      document.getElementById('editBaslangic').value=c.baslangic_parasi||'';
      document.getElementById('editKomisyon').value=c.komisyon_orani||25;
      document.getElementById('editParaBirimi').value=c.para_birimi||'TL';
      document.getElementById('editEsDost').checked=!!c.es_dost;
      document.getElementById('editAktif').checked=c.aktif!==false;
      document.getElementById('editRdpIp').value=c.rdp_ip||'';
      document.getElementById('editRdpKullanici').value=c.rdp_kullanici||'';
      document.getElementById('editRdpSifre').value=c.rdp_sifre||'';
      document.getElementById('editRdpSifre').type='password';
      const sozLink = c.sozlesme_link||'';
      document.getElementById('editSozlesme').value=sozLink;
      const sozBtn = document.getElementById('sozlesmeAc');
      if(sozLink){ sozBtn.style.display='inline-block'; sozBtn.href=sozLink; } else { sozBtn.style.display='none'; }
      document.getElementById('editSozlesme').oninput=function(){
        if(this.value){ sozBtn.style.display='inline-block'; sozBtn.href=this.value; } else { sozBtn.style.display='none'; }
      };
      updateKomisyonBilgi(c);
      document.getElementById('editBaslangic').oninput=function(){updateKomisyonBilgi({...c,baslangic_parasi:this.value,komisyon_orani:document.getElementById('editKomisyon').value,para_birimi:document.getElementById('editParaBirimi').value});};
      document.getElementById('editKomisyon').onchange=function(){updateKomisyonBilgi({...c,baslangic_parasi:document.getElementById('editBaslangic').value,komisyon_orani:this.value,para_birimi:document.getElementById('editParaBirimi').value});};
      document.getElementById('editModal').classList.add('show');
    }

    function updateKomisyonBilgi(c){
      const esDost=document.getElementById('editEsDost')?document.getElementById('editEsDost').checked:c.es_dost;
      if(esDost){document.getElementById('komisyonBilgi').textContent='';return;}
      const varlik=parseFloat(c.varlik)||0,baslangic=parseFloat(c.baslangic_parasi)||0,oran=(parseFloat(c.komisyon_orani)||0)/100;
      let komisyon=0,fark=0;
      if(c.para_birimi==='USD'){fark=varlik/DOLAR_KURU-baslangic;komisyon=fark*oran*DOLAR_KURU;}
      else{fark=varlik-baslangic;komisyon=fark*oran;}
      if(varlik>0){
        const sign=fark>=0?'+':'';
        document.getElementById('komisyonBilgi').innerHTML='💰 Varlik <strong>'+formatMoney(varlik)+'</strong> - Baslangic <strong>'+formatMoney(baslangic)+'</strong> = <strong>'+sign+formatMoney(fark)+'</strong><br>📊 Komisyon (%'+(parseFloat(c.komisyon_orani)||0)+'): <strong>'+(komisyon>=0?'+':'')+formatMoney(komisyon)+' TL</strong>';
      }else{
        document.getElementById('komisyonBilgi').innerHTML='ℹ️ Canli veri geldiginde komisyon hesaplanacak.';
      }
    }

    function handleModalBackdrop(e){if(e.target===document.getElementById('editModal'))closeEditModal();}
    function closeEditModal(){document.getElementById('editModal').classList.remove('show');}

    async function saveCustomer(){
      const hesap_no=document.getElementById('editHesapNo').value;
      const baslangic=parseFloat(document.getElementById('editBaslangic').value)||0;
      const data={
        baslangic_parasi:baslangic,hakedis_miktari:baslangic,
        komisyon_orani:parseInt(document.getElementById('editKomisyon').value)||0,
        para_birimi:document.getElementById('editParaBirimi').value,
        es_dost:document.getElementById('editEsDost').checked,
        aktif:document.getElementById('editAktif').checked,
        rdp_ip:document.getElementById('editRdpIp').value||null,
        rdp_kullanici:document.getElementById('editRdpKullanici').value||null,
        rdp_sifre:document.getElementById('editRdpSifre').value||null,
        sozlesme_link:document.getElementById('editSozlesme').value||null
      };
      try{
        const res=await fetch('/api/kayit/'+hesap_no,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if(res.ok){closeEditModal();await loadData();}else alert('Kayit sirasinda hata olustu!');
      }catch(e){alert('Baglanti hatasi!');}
    }

    async function loadData(){
      try{
        const [mRes,kayitliRes,kurRes,kopRes,grafRes]=await Promise.all([fetch('/api/musteriler'),fetch('/api/kayitli'),fetch('/api/kur'),fetch('/api/kopukluklar'),fetch('/api/grafik-uyarilari')]);
        const mData=await mRes.json();
        const kopData=await kopRes.json().catch(()=>[]);
        const grafData=await grafRes.json().catch(()=>[]);
        window._kopData=kopData;
        window._grafData=grafData;
        kayitliCustomers=await kayitliRes.json();
        const kurData=await kurRes.json();
        DOLAR_KURU=kurData.kur||43;
        MARKET_OPEN=kurData.marketOpen;
        // musteriler tablosundaki verileri kayitli musterilerle birlestir
        // kayitli musteri id'lerini bir map'e al
        const kayitliMap={};
        kayitliCustomers.forEach(k=>{ kayitliMap[k.hesap_no]=k; });
        // canli veri gelenleri kayitli bilgilerle zenginlestir
        allCustomers=mData.map(m=>{
          const k=kayitliMap[m.hesap_no]||{};
          return {...m, ...k, varlik:m.varlik, bugun_kar:m.bugun_kar, bugun_yuzde:m.bugun_yuzde, son_guncelleme:m.son_guncelleme};
        });
        // canli veri gelmeyenler de listede gorunsun
        kayitliCustomers.forEach(k=>{
          if(!allCustomers.find(a=>a.hesap_no===k.hesap_no)) allCustomers.push(k);
        });
        updateCounts();
        renderCards();
      }catch(e){
        console.error('loadData hatasi:',e);
        document.getElementById('customerGrid').innerHTML='<div class="no-data" style="color:red">Veri yuklenemedi: '+e.message+'</div>';
      }
    }

    loadData().then(function(){
      var params=new URLSearchParams(window.location.search);
      var editNo=params.get('edit');
      if(editNo){
        var c=allCustomers.find(function(x){return x.hesap_no==editNo;});
        if(c) openEditModal(c);
      }
    });
    setInterval(loadData,60000);
  </script>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;

function getRobotPage() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Robot Performans</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#1a1a2e}
.header{background:linear-gradient(135deg,#1a73e8,#0d47a1);color:#fff;padding:14px 20px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:1.1rem;font-weight:600}
.header-btns{display:flex;gap:8px}
.hbtn{background:rgba(255,255,255,0.15);color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:0.8rem;text-decoration:none}
.hbtn:hover{background:rgba(255,255,255,0.25)}
.container{max-width:1200px;margin:0 auto;padding:16px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.stat-card{background:#fff;border-radius:10px;padding:14px 18px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center}
.stat-val{font-size:1.3rem;font-weight:700}
.stat-lbl{font-size:0.65rem;color:#888;margin-top:3px}
.card{background:#fff;border-radius:10px;padding:18px;box-shadow:0 1px 3px rgba(0,0,0,0.08);margin-bottom:16px}
.card h2{font-size:0.9rem;font-weight:600;color:#444;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #f0f0f0}
.chart-wrap{position:relative;height:300px}
.monthly-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.month-cell{padding:8px 6px;border-radius:6px;text-align:center}
.month-name{font-size:0.65rem;color:#666;margin-bottom:2px}
.month-val{font-size:0.78rem;font-weight:700}
.mpos{background:#dcfce7;color:#16a34a}
.mneg{background:#fee2e2;color:#dc2626}
.mzero{background:#f3f4f6;color:#666}
@media(max-width:600px){.stats-grid{grid-template-columns:repeat(2,1fr)}.monthly-grid{grid-template-columns:repeat(3,1fr)}}
</style>
</head>
<body>
<div class="header">
  <h1>&#x1F4C8; Robot Performans</h1>
  <div class="header-btns">
    <a href="/" class="hbtn">&#x1F3E0; Ana Sayfa</a>
    <a href="/musteriler" class="hbtn">&#x1F465; Musteriler</a>
    <a href="/robot-detay" class="hbtn">&#x1F4CB; Gunluk Veri</a>
    <button onclick="exportExcel()" class="hbtn">&#x1F4E5; Excel</button>
  </div>
</div>
<div class="container">
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-val" id="sToplam" style="color:#16a34a">-</div><div class="stat-lbl">Toplam Getiri</div></div>
    <div class="stat-card"><div class="stat-val" id="sSure" style="color:#1a73e8">-</div><div class="stat-lbl">Gecen Sure</div></div>
    <div class="stat-card"><div class="stat-val" id="sDrawdown" style="color:#dc2626">-</div><div class="stat-lbl">Maks. Drawdown</div></div>
    <div class="stat-card"><div class="stat-val" id="sGunluk" style="color:#d97706">-</div><div class="stat-lbl">Ort. Gunluk Getiri</div></div>
  </div>
  <div class="card">
    <h2>Bakiye Grafigi (100.000 TL baslangic)</h2>
    <div class="chart-wrap"><canvas id="chartBakiye"></canvas></div>
  </div>
  <div class="card">
    <h2>Aylik Getiri</h2>
    <div class="monthly-grid" id="monthlyGrid"></div>
  </div>
</div>
<script>
var DAILY_DATA=[["2024-01-01", 100000.0], ["2024-01-02", 107806.46], ["2024-01-03", 101487.67], ["2024-01-04", 103330.67], ["2024-01-05", 106614.43], ["2024-01-08", 114937.58], ["2024-01-09", 111130.76], ["2024-01-10", 115483.98], ["2024-01-11", 115473.88], ["2024-01-12", 113809.12], ["2024-01-15", 117940.64], ["2024-01-16", 119015.64], ["2024-01-17", 118245.89], ["2024-01-18", 117226.78], ["2024-01-19", 116816.08], ["2024-01-22", 117564.67], ["2024-01-23", 113711.1], ["2024-01-24", 112893.61], ["2024-01-25", 116830.08], ["2024-01-26", 124415.79], ["2024-01-29", 131723.39], ["2024-01-30", 133662.9], ["2024-01-31", 132524.84], ["2024-02-01", 135134.59], ["2024-02-02", 134691.0], ["2024-02-05", 135114.26], ["2024-02-06", 139417.21], ["2024-02-07", 140379.98], ["2024-02-08", 140296.71], ["2024-02-09", 139839.99], ["2024-02-12", 145948.23], ["2024-02-13", 139483.16], ["2024-02-14", 140835.86], ["2024-02-15", 144210.64], ["2024-02-16", 143738.75], ["2024-02-19", 143547.93], ["2024-02-20", 145086.31], ["2024-02-21", 144251.46], ["2024-02-22", 143669.15], ["2024-02-23", 144345.21], ["2024-02-26", 145232.75], ["2024-02-27", 144952.12], ["2024-02-28", 145114.32], ["2024-02-29", 145277.38], ["2024-03-01", 143476.85], ["2024-03-04", 142458.8], ["2024-03-05", 141921.84], ["2024-03-06", 142081.5], ["2024-03-07", 145848.66], ["2024-03-08", 148599.06], ["2024-03-11", 149308.4], ["2024-03-12", 147689.53], ["2024-03-13", 147304.84], ["2024-03-14", 147471.51], ["2024-03-15", 147638.76], ["2024-03-18", 148139.34], ["2024-03-19", 150247.08], ["2024-03-20", 150177.16], ["2024-03-21", 156493.66], ["2024-03-22", 156655.73], ["2024-03-25", 156468.29], ["2024-03-26", 153681.71], ["2024-03-27", 153720.54], ["2024-03-28", 155959.17], ["2024-03-29", 154602.82], ["2024-04-01", 153348.51], ["2024-04-02", 153939.41], ["2024-04-03", 152165.89], ["2024-04-04", 156359.37], ["2024-04-05", 165843.39], ["2024-04-08", 166179.3], ["2024-04-09", 166769.76], ["2024-04-15", 164085.21], ["2024-04-16", 161893.29], ["2024-04-17", 157182.62], ["2024-04-18", 157375.83], ["2024-04-19", 163006.39], ["2024-04-22", 159104.53], ["2024-04-24", 160684.36], ["2024-04-25", 157871.37], ["2024-04-26", 161259.63], ["2024-04-29", 167716.83], ["2024-04-30", 165248.47], ["2024-05-02", 167227.23], ["2024-05-03", 166297.04], ["2024-05-06", 164845.04], ["2024-05-07", 165905.38], ["2024-05-08", 162269.63], ["2024-05-09", 162196.27], ["2024-05-10", 159761.14], ["2024-05-13", 159636.07], ["2024-05-14", 157522.3], ["2024-05-15", 155207.37], ["2024-05-16", 157707.63], ["2024-05-17", 169037.93], ["2024-05-20", 173803.55], ["2024-05-21", 181542.98], ["2024-05-22", 177819.85], ["2024-05-23", 171581.58], ["2024-05-24", 170031.71], ["2024-05-27", 170584.49], ["2024-05-28", 170791.18], ["2024-05-29", 171018.13], ["2024-05-30", 171226.86], ["2024-05-31", 165911.42], ["2024-06-03", 165703.0], ["2024-06-04", 160735.29], ["2024-06-05", 161725.53], ["2024-06-06", 160950.67], ["2024-06-07", 161215.57], ["2024-06-10", 161789.38], ["2024-06-11", 161999.22], ["2024-06-12", 163051.18], ["2024-06-13", 165253.29], ["2024-06-14", 166343.95], ["2024-06-20", 169820.84], ["2024-06-21", 170362.78], ["2024-06-24", 170097.2], ["2024-06-25", 168108.28], ["2024-06-26", 167956.05], ["2024-06-27", 168499.86], ["2024-06-28", 168936.37], ["2024-07-01", 166624.84], ["2024-07-02", 166710.02], ["2024-07-03", 176374.8], ["2024-07-04", 179830.14], ["2024-07-05", 179089.19], ["2024-07-08", 178613.59], ["2024-07-09", 177252.17], ["2024-07-10", 177535.91], ["2024-07-11", 180578.35], ["2024-07-12", 180712.14], ["2024-07-16", 184260.44], ["2024-07-17", 183080.91], ["2024-07-18", 182353.63], ["2024-07-19", 181822.81], ["2024-07-22", 181474.64], ["2024-07-23", 180503.4], ["2024-07-24", 180547.04], ["2024-07-25", 180763.56], ["2024-07-26", 180975.13], ["2024-07-29", 181603.79], ["2024-07-30", 181812.55], ["2024-07-31", 182018.4], ["2024-08-01", 184692.5], ["2024-08-02", 180249.59], ["2024-08-05", 179263.61], ["2024-08-06", 179481.22], ["2024-08-07", 179701.21], ["2024-08-08", 180188.52], ["2024-08-09", 178033.64], ["2024-08-12", 176828.93], ["2024-08-13", 176777.61], ["2024-08-14", 171742.5], ["2024-08-15", 173954.59], ["2024-08-16", 168515.92], ["2024-08-19", 172714.42], ["2024-08-20", 172686.16], ["2024-08-21", 171718.76], ["2024-08-22", 172600.18], ["2024-08-23", 170950.95], ["2024-08-26", 171568.91], ["2024-08-27", 172107.51], ["2024-08-28", 170047.8], ["2024-08-29", 171148.11], ["2024-09-02", 178887.04], ["2024-09-03", 177190.69], ["2024-09-04", 176595.42], ["2024-09-05", 176686.33], ["2024-09-06", 176541.41], ["2024-09-09", 177197.55], ["2024-09-10", 177417.71], ["2024-09-11", 177636.23], ["2024-09-12", 177854.36], ["2024-09-13", 179841.04], ["2024-09-16", 178024.38], ["2024-09-17", 181559.03], ["2024-09-18", 182548.11], ["2024-09-19", 187975.11], ["2024-09-20", 188177.82], ["2024-09-23", 188641.34], ["2024-09-24", 194781.76], ["2024-09-25", 192803.99], ["2024-09-26", 190275.63], ["2024-09-27", 190897.78], ["2024-09-30", 191559.15], ["2024-10-01", 191810.42], ["2024-10-02", 192018.16], ["2024-10-03", 192247.1], ["2024-10-04", 192476.09], ["2024-10-07", 193167.48], ["2024-10-08", 191260.4], ["2024-10-09", 192865.13], ["2024-10-10", 188744.81], ["2024-10-11", 187645.25], ["2024-10-14", 187150.17], ["2024-10-15", 187019.68], ["2024-10-16", 190646.37], ["2024-10-17", 188577.82], ["2024-10-18", 185653.34], ["2024-10-21", 186122.36], ["2024-10-22", 183597.88], ["2024-10-23", 179624.49], ["2024-10-24", 179164.1], ["2024-10-25", 179115.29], ["2024-10-28", 179906.73], ["2024-10-30", 180675.73], ["2024-10-31", 177329.06], ["2024-11-01", 177289.46], ["2024-11-04", 176069.91], ["2024-11-05", 176265.01], ["2024-11-06", 177744.06], ["2024-11-07", 178905.38], ["2024-11-08", 190001.88], ["2024-11-11", 193976.68], ["2024-11-12", 192076.68], ["2024-11-13", 192513.74], ["2024-11-14", 193792.24], ["2024-11-15", 190885.29], ["2024-11-18", 190334.11], ["2024-11-19", 186797.63], ["2024-11-20", 186999.11], ["2024-11-21", 190223.16], ["2024-11-22", 199686.39], ["2024-11-25", 203212.95], ["2024-11-26", 200472.42], ["2024-11-27", 200192.32], ["2024-11-28", 200522.4], ["2024-11-29", 198155.11], ["2024-12-02", 199640.32], ["2024-12-03", 202612.57], ["2024-12-04", 201920.09], ["2024-12-05", 201916.81], ["2024-12-06", 203178.06], ["2024-12-09", 206210.39], ["2024-12-10", 201859.69], ["2024-12-11", 201394.94], ["2024-12-12", 201585.83], ["2024-12-13", 201809.98], ["2024-12-16", 200905.09], ["2024-12-17", 200905.25], ["2024-12-18", 199778.4], ["2024-12-19", 198883.42], ["2024-12-20", 199045.69], ["2024-12-23", 200681.23], ["2024-12-24", 201029.07], ["2024-12-25", 205724.42], ["2024-12-26", 204500.32], ["2024-12-27", 204177.41], ["2024-12-30", 203276.18], ["2024-12-31", 200316.85], ["2025-01-02", 201835.29], ["2025-01-03", 201333.43], ["2025-01-06", 202512.19], ["2025-01-07", 201399.46], ["2025-01-08", 201128.39], ["2025-01-09", 202466.1], ["2025-01-10", 198984.29], ["2025-01-13", 199767.92], ["2025-01-14", 200009.82], ["2025-01-15", 200252.17], ["2025-01-16", 197212.73], ["2025-01-17", 201542.4], ["2025-01-20", 202097.36], ["2025-01-21", 201903.16], ["2025-01-22", 204741.88], ["2025-01-23", 203272.92], ["2025-01-24", 204085.33], ["2025-01-27", 203321.41], ["2025-01-28", 205174.7], ["2025-01-29", 202139.15], ["2025-01-30", 200390.92], ["2025-01-31", 199405.44], ["2025-02-03", 199836.57], ["2025-02-04", 200070.66], ["2025-02-05", 200302.38], ["2025-02-06", 199935.69], ["2025-02-07", 201855.65], ["2025-02-10", 199004.54], ["2025-02-11", 198849.51], ["2025-02-12", 198905.46], ["2025-02-13", 199028.85], ["2025-02-14", 198129.25], ["2025-02-17", 198380.25], ["2025-02-18", 199160.9], ["2025-02-19", 196968.56], ["2025-02-20", 197576.74], ["2025-02-21", 196845.42], ["2025-02-24", 197683.46], ["2025-02-25", 197874.25], ["2025-02-26", 198483.98], ["2025-02-27", 203797.93], ["2025-02-28", 202635.6], ["2025-03-03", 216843.81], ["2025-03-04", 216077.38], ["2025-03-05", 225733.69], ["2025-03-06", 230543.68], ["2025-03-07", 228231.91], ["2025-03-10", 226829.87], ["2025-03-11", 227501.28], ["2025-03-12", 231827.35], ["2025-03-13", 232654.6], ["2025-03-14", 233483.92], ["2025-03-17", 232696.3], ["2025-03-18", 231931.12], ["2025-03-19", 228014.43], ["2025-03-20", 228224.67], ["2025-03-21", 228438.92], ["2025-03-24", 229111.29], ["2025-03-25", 234242.94], ["2025-03-26", 225001.67], ["2025-03-27", 223043.95], ["2025-03-28", 222959.62], ["2025-04-02", 222845.74], ["2025-04-03", 222744.91], ["2025-04-04", 222958.42], ["2025-04-07", 223615.92], ["2025-04-08", 220163.02], ["2025-04-09", 211828.66], ["2025-04-10", 206463.83], ["2025-04-11", 205458.74], ["2025-04-14", 203903.16], ["2025-04-15", 203525.63], ["2025-04-16", 203204.32], ["2025-04-17", 199481.23], ["2025-04-18", 200180.55], ["2025-04-21", 193883.12], ["2025-04-22", 194346.29], ["2025-04-24", 199669.27], ["2025-04-25", 196639.49], ["2025-04-28", 196509.07], ["2025-04-29", 196160.52], ["2025-04-30", 196362.61], ["2025-05-02", 197973.78], ["2025-05-05", 197855.81], ["2025-05-06", 196700.39], ["2025-05-07", 198571.25], ["2025-05-08", 201391.99], ["2025-05-09", 201659.68], ["2025-05-12", 210976.62], ["2025-05-13", 211665.34], ["2025-05-14", 212197.58], ["2025-05-15", 209622.87], ["2025-05-16", 210753.99], ["2025-05-20", 211305.89], ["2025-05-21", 211183.7], ["2025-05-22", 211551.64], ["2025-05-23", 211761.48], ["2025-05-26", 212428.12], ["2025-05-27", 212652.16], ["2025-05-28", 212876.49], ["2025-05-29", 213100.99], ["2025-05-30", 213325.69], ["2025-06-02", 214000.48], ["2025-06-03", 219294.92], ["2025-06-04", 222669.74], ["2025-06-05", 222743.18], ["2025-06-10", 230353.78], ["2025-06-11", 229260.32], ["2025-06-12", 225041.37], ["2025-06-13", 221905.42], ["2025-06-16", 222587.42], ["2025-06-17", 221422.98], ["2025-06-18", 219481.13], ["2025-06-19", 219693.01], ["2025-06-20", 219917.08], ["2025-06-23", 220580.92], ["2025-06-24", 218080.73], ["2025-06-25", 218539.83], ["2025-06-26", 214686.25], ["2025-06-27", 212924.5], ["2025-06-30", 248205.95], ["2025-07-01", 249917.41], ["2025-07-02", 257546.14], ["2025-07-03", 257751.4], ["2025-07-04", 258837.43], ["2025-07-07", 249916.82], ["2025-07-08", 251109.19], ["2025-07-09", 251738.99], ["2025-07-10", 259425.64], ["2025-07-11", 258714.74], ["2025-07-14", 258833.82], ["2025-07-16", 261521.14], ["2025-07-17", 265053.7], ["2025-07-18", 261785.71], ["2025-07-21", 274764.93], ["2025-07-22", 273653.84], ["2025-07-23", 274133.95], ["2025-07-24", 274865.53], ["2025-07-25", 273368.39], ["2025-07-28", 272845.13], ["2025-07-29", 272888.28], ["2025-07-30", 273134.7], ["2025-07-31", 274678.55], ["2025-08-01", 276303.17], ["2025-08-04", 281968.62], ["2025-08-05", 279665.15], ["2025-08-06", 280118.84], ["2025-08-07", 280005.01], ["2025-08-08", 279129.37], ["2025-08-11", 278636.12], ["2025-08-12", 276991.47], ["2025-08-13", 276593.42], ["2025-08-14", 274671.21], ["2025-08-15", 274909.04], ["2025-08-18", 275654.22], ["2025-08-19", 274932.37], ["2025-08-20", 282354.18], ["2025-08-21", 286595.1], ["2025-08-22", 287416.25], ["2025-08-25", 288764.83], ["2025-08-26", 287326.49], ["2025-08-27", 286032.41], ["2025-08-28", 286392.45], ["2025-08-29", 286649.58], ["2025-09-01", 285185.98], ["2025-09-02", 276094.61], ["2025-09-03", 276317.0], ["2025-09-04", 276567.61], ["2025-09-05", 276818.39], ["2025-09-08", 277571.2], ["2025-09-09", 277822.11], ["2025-09-10", 280173.49], ["2025-09-11", 273234.73], ["2025-09-12", 273457.73], ["2025-09-15", 297663.75], ["2025-09-16", 302782.35], ["2025-09-17", 302603.26], ["2025-09-18", 297951.38], ["2025-09-19", 301120.04], ["2025-09-22", 309125.78], ["2025-09-23", 306051.69], ["2025-09-24", 300721.6], ["2025-09-25", 301441.19], ["2025-09-26", 297918.94], ["2025-09-29", 297594.43], ["2025-09-30", 297844.16], ["2025-10-01", 302749.92], ["2025-10-02", 287997.71], ["2025-10-03", 280593.13], ["2025-10-06", 281308.74], ["2025-10-07", 281548.8], ["2025-10-08", 281789.13], ["2025-10-09", 282029.75], ["2025-10-10", 282270.35], ["2025-10-13", 282920.58], ["2025-10-14", 283161.12], ["2025-10-15", 283401.56], ["2025-10-16", 283642.56], ["2025-10-17", 283883.76], ["2025-10-20", 292356.31], ["2025-10-21", 296325.91], ["2025-10-22", 301811.02], ["2025-10-23", 296356.6], ["2025-10-24", 314684.83], ["2025-10-27", 308572.56], ["2025-10-28", 304630.92], ["2025-10-30", 301754.45], ["2025-10-31", 301920.52], ["2025-11-03", 308001.16], ["2025-11-04", 302593.33], ["2025-11-05", 293599.3], ["2025-11-06", 294884.66], ["2025-11-07", 286338.9], ["2025-11-10", 281968.62], ["2025-11-12", 282203.27], ["2025-11-13", 282438.04], ["2025-11-14", 282673.08], ["2025-11-17", 281449.05], ["2025-11-18", 277785.88], ["2025-11-19", 287469.16], ["2025-11-20", 290410.59], ["2025-11-21", 283178.58], ["2025-11-24", 281416.41], ["2025-11-25", 278016.9], ["2025-11-26", 280383.47], ["2025-11-27", 282116.99], ["2025-11-28", 278636.39], ["2025-12-01", 291584.99], ["2025-12-02", 285536.15], ["2025-12-03", 280996.19], ["2025-12-04", 277225.2], ["2025-12-05", 277443.85], ["2025-12-08", 278082.9], ["2025-12-09", 281334.84], ["2025-12-10", 272443.21], ["2025-12-11", 268492.61], ["2025-12-12", 270056.86], ["2025-12-15", 274541.44], ["2025-12-16", 270624.12], ["2025-12-17", 270812.54], ["2025-12-18", 271028.95], ["2025-12-19", 271245.43], ["2025-12-22", 270185.03], ["2025-12-23", 268984.51], ["2025-12-24", 267915.3], ["2025-12-25", 263933.07], ["2025-12-26", 262772.74], ["2025-12-29", 263244.52], ["2025-12-30", 263452.17], ["2025-12-31", 263216.14], ["2026-01-02", 279329.81], ["2026-01-05", 285143.26], ["2026-01-06", 298150.13], ["2026-01-07", 294415.82], ["2026-01-08", 291219.27], ["2026-01-09", 295451.93], ["2026-01-12", 296101.3], ["2026-01-13", 298639.62], ["2026-01-14", 295940.2], ["2026-01-15", 298354.33], ["2026-01-16", 306458.36], ["2026-01-19", 315564.34], ["2026-01-20", 317892.13], ["2026-01-21", 317018.86], ["2026-01-22", 305387.72], ["2026-01-23", 299289.41], ["2026-01-26", 304629.24], ["2026-01-27", 299057.67], ["2026-01-28", 304447.55], ["2026-01-29", 325233.83], ["2026-01-30", 328795.44], ["2026-02-02", 310969.65], ["2026-02-03", 321275.96], ["2026-02-04", 318456.52], ["2026-02-05", 311947.18], ["2026-02-06", 310668.78], ["2026-02-09", 313405.91], ["2026-02-10", 307738.57], ["2026-02-11", 306338.4], ["2026-02-12", 326435.37], ["2026-02-13", 324303.89], ["2026-02-16", 325232.09], ["2026-02-17", 318972.32], ["2026-02-18", 316837.99], ["2026-02-19", 313970.22], ["2026-02-20", 315625.11], ["2026-02-23", 314257.19], ["2026-02-24", 310849.33], ["2026-02-25", 305873.8], ["2026-02-26", 306089.49], ["2026-02-27", 301404.87], ["2026-03-02", 303024.92], ["2026-03-03", 301216.89]];
var MONTHLY_PCT={"2024-01": 32.52, "2024-02": 9.62, "2024-03": 6.42, "2024-04": 6.89, "2024-05": 0.4, "2024-06": 1.82, "2024-07": 7.74, "2024-08": -5.97, "2024-09": 11.93, "2024-10": -7.43, "2024-11": 11.74, "2024-12": 1.09, "2025-01": -0.45, "2025-02": 1.62, "2025-03": 10.03, "2025-04": -11.93, "2025-05": 8.64, "2025-06": 16.35, "2025-07": 10.67, "2025-08": 4.36, "2025-09": 3.91, "2025-10": 1.37, "2025-11": -7.71, "2025-12": -5.53, "2026-01": 24.91, "2026-02": -8.33, "2026-03": -0.06};
var MONTH_NAMES=["Oca","Sub","Mar","Nis","May","Haz","Tem","Agu","Eyl","Eki","Kas","Ara"];

function exportExcel(){
  var wb=XLSX.utils.book_new();
  var rows=[["Tarih","Bakiye (TL)","Gunluk Degisim %","Kaynak"]];
  var ed=window._extData||DAILY_DATA;
  var si=window._splitIdx||DAILY_DATA.length;
  for(var i=0;i<ed.length;i++){
    var prevB=i>0?ed[i-1][1]:null;
    var pct=prevB?Math.round((ed[i][1]/prevB-1)*100000)/1000:null;
    var kaynak=i===0?"Baslangic":i<si?"Gecmis Veri":"DB Kayitli / Canli";
    rows.push([ed[i][0],Math.round(ed[i][1]*100)/100,pct,kaynak]);
  }
  var ws=XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"]=[{wch:14},{wch:16},{wch:18},{wch:20}];
  XLSX.utils.book_append_sheet(wb,ws,"Robot Performans");
  var mrows=[["Ay","Getiri %"]];
  Object.keys(MONTHLY_PCT).sort().forEach(function(ym){mrows.push([ym,MONTHLY_PCT[ym]]);});
  var ws2=XLSX.utils.aoa_to_sheet(mrows);
  XLSX.utils.book_append_sheet(wb,ws2,"Aylik Getiri");
  XLSX.writeFile(wb,"robot_performans_"+new Date().toISOString().slice(0,10)+".xlsx");
}

async function init(){
  var dbRows=[];
  try{
    var r=await fetch("/api/robot-gunluk");
    dbRows=await r.json();
  }catch(e){}

  var liveAvgPct=0;
  try{
    var r2=await fetch("/api/musteriler");
    var data=await r2.json();
    if(data.length>0){
      var s=0;
      for(var i=0;i<data.length;i++) s+=parseFloat(data[i].bugun_yuzde)||0;
      liveAvgPct=s/data.length;
    }
  }catch(e){}

  var extData=DAILY_DATA.slice();
  var lastDbDate=extData[extData.length-1][0];
  for(var i=0;i<dbRows.length;i++){
    var d=dbRows[i].tarih.slice(0,10);
    if(d>lastDbDate){
      extData.push([d,parseFloat(dbRows[i].bakiye)]);
      lastDbDate=d;
    }
  }
  var today=new Date();
  today.setHours(0,0,0,0);
  var todayStr=today.toISOString().slice(0,10);
  if(todayStr>lastDbDate && today.getDay()!==0 && today.getDay()!==6){
    var lastB=extData[extData.length-1][1];
    extData.push([todayStr,Math.round(lastB*(1+liveAvgPct/100)*100)/100]);
  }
  window._extData=extData;
  window._liveAvgPct=liveAvgPct;
  window._splitIdx=DAILY_DATA.length;

  var ilk=extData[0][1];
  var son=extData[extData.length-1][1];
  var toplamPct=((son/ilk)-1)*100;
  var startDate=new Date(extData[0][0]);
  var endDate=new Date(extData[extData.length-1][0]);
  var totalDays=Math.round((endDate-startDate)/(1000*60*60*24));
  var yil=Math.floor(totalDays/365);
  var ay=Math.floor((totalDays%365)/30);
  var gun=(totalDays%365)%30;
  var sureStr="";
  if(yil>0)sureStr+=yil+" yil ";
  if(ay>0)sureStr+=ay+" ay ";
  if(gun>0&&yil===0)sureStr+=gun+" gun";
  var peak=ilk,maxDD=0;
  for(var j=0;j<extData.length;j++){
    var b=extData[j][1];
    if(b>peak)peak=b;
    var dd=(peak-b)/peak*100;
    if(dd>maxDD)maxDD=dd;
  }
  var gsum=0;
  for(var k=1;k<extData.length;k++) gsum+=(extData[k][1]/extData[k-1][1]-1)*100;
  var gort=gsum/(extData.length-1);
  document.getElementById("sToplam").textContent=(toplamPct>=0?"+":"")+toplamPct.toFixed(1)+"%";
  document.getElementById("sToplam").style.color=toplamPct>=0?"#16a34a":"#dc2626";
  document.getElementById("sSure").textContent=sureStr.trim();
  document.getElementById("sDrawdown").textContent="-"+maxDD.toFixed(1)+"%";
  document.getElementById("sGunluk").textContent=(gort>=0?"+":"")+gort.toFixed(3)+"%";

  var labels=extData.map(function(x){return x[0];});
  var values=extData.map(function(x){return x[1];});
  var si=DAILY_DATA.length;
  new Chart(document.getElementById("chartBakiye"),{
    type:"line",
    data:{labels:labels,datasets:[{data:values,segment:{borderColor:function(ctx){return ctx.p0DataIndex<si-1?"#1a73e8":"#f59e0b";}},pointRadius:0,borderWidth:2,tension:0.1,fill:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return new Intl.NumberFormat("tr-TR").format(Math.round(ctx.raw))+" TL";}}}},
      scales:{x:{ticks:{maxTicksLimit:14,callback:function(val,i){return labels[i]?labels[i].slice(0,7):""}},grid:{display:false}},y:{ticks:{callback:function(v){return new Intl.NumberFormat("tr-TR").format(Math.round(v));}}}}}
  });

  // Aylik getiri: extData'dan dinamik hesapla
  // Her ay icin: o ayin ilk gununun onceki ayin son bakiyesi baz alinir
  var aylikData={};
  // Once MONTHLY_PCT'yi base al (gecmis sabit veriler)
  Object.keys(MONTHLY_PCT).forEach(function(ym){ aylikData[ym]=MONTHLY_PCT[ym]; });

  // extData'dan DB+canli gunleri icin son N ayin gercek degerini hesapla
  // extData'daki son 2 ayi dinamik hesapla (DB verileri geldikce daha dogru olur)
  var aylikSon={};
  for(var ai=0;ai<extData.length;ai++){
    var aym=extData[ai][0].slice(0,7);
    aylikSon[aym]={bakiye:extData[ai][1],idx:ai};
    if(!aylikSon[aym].first) aylikSon[aym].first={bakiye:extData[ai][1],idx:ai};
  }
  // Her ay icin: o ayin son bakiyesi / bir onceki ayin son bakiyesi
  var aylar=Object.keys(aylikSon).sort();
  for(var ai2=1;ai2<aylar.length;ai2++){
    var curAy=aylar[ai2];
    var prevAy=aylar[ai2-1];
    if(aylikSon[prevAy] && aylikSon[curAy]){
      var prevB2=aylikSon[prevAy].bakiye;
      var curB2=aylikSon[curAy].bakiye;
      var ayPct=Math.round((curB2/prevB2-1)*10000)/100;
      // Sadece DAILY_DATA'dan sonraki aylar icin guncelle (oncekiler sabit kalsin)
      var lastStaticAy=Object.keys(MONTHLY_PCT).sort().pop();
      if(curAy>=lastStaticAy){
        aylikData[curAy]=ayPct;
      }
    }
  }

  var grid=document.getElementById("monthlyGrid");
  var entries=Object.keys(aylikData).sort();
  for(var q=0;q<entries.length;q++){
    var ym=entries[q];
    var pct=aylikData[ym];
    var parts=ym.split("-");
    var isCurMonth=(ym===new Date().toISOString().slice(0,7));
    var cell=document.createElement("div");
    cell.className="month-cell "+(pct>0?"mpos":pct<0?"mneg":"mzero");
    var label=isCurMonth?" <small style='font-size:0.6rem;opacity:0.7'>(devam)</small>":"";
    cell.innerHTML='<div class="month-name">'+parts[0]+" "+MONTH_NAMES[parseInt(parts[1])-1]+label+'</div><div class="month-val">'+(pct>0?"+":"")+pct.toFixed(1)+"%</div>";
    grid.appendChild(cell);
  }
}
init();
</script>
</body>
</html>`;
}

function getRobotDetayPage() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Gunluk Veri Detayi</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;color:#1a1a2e;font-size:0.85rem}
.header{background:linear-gradient(135deg,#1a73e8,#0d47a1);color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:1rem;font-weight:600}
.hbtn{background:rgba(255,255,255,0.15);color:#fff;border:none;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:0.78rem;text-decoration:none}
.hbtn:hover{background:rgba(255,255,255,0.25)}
.container{max-width:900px;margin:0 auto;padding:16px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.stat-card{background:#fff;border-radius:8px;padding:12px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.08);text-align:center}
.stat-val{font-size:1.1rem;font-weight:700}
.stat-lbl{font-size:0.65rem;color:#888;margin-top:3px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
thead{background:#f8fafc}
th{padding:10px 14px;text-align:left;font-size:0.75rem;color:#666;font-weight:600;border-bottom:2px solid #e5e7eb}
td{padding:8px 14px;border-bottom:1px solid #f0f0f0}
tr:last-child td{border-bottom:none}
.pos{color:#16a34a;font-weight:600}
.neg{color:#dc2626;font-weight:600}
.badge-gecmis{background:#dbeafe;color:#1d4ed8;padding:2px 7px;border-radius:10px;font-size:0.7rem;font-weight:600}
.badge-db{background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:10px;font-size:0.7rem;font-weight:600}
.badge-canli{background:#dcfce7;color:#15803d;padding:2px 7px;border-radius:10px;font-size:0.7rem;font-weight:600}
.edit-btn{background:none;border:1px solid #ddd;border-radius:4px;padding:2px 7px;cursor:pointer;font-size:0.7rem;color:#888;margin-left:4px}
.edit-btn:hover{background:#f3f4f6;color:#333}
.edit-row{display:none;background:#fffbeb}
.edit-input{width:80px;padding:4px 8px;border:1px solid #fcd34d;border-radius:4px;font-size:0.8rem;text-align:center}
.save-btn{background:#16a34a;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;margin-left:6px}
.cancel-btn{background:#f3f4f6;color:#666;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:0.75rem;margin-left:4px}
</style>
</head>
<body>
<div class="header">
  <h1>&#x1F4CB; Gunluk Veri Detayi</h1>
  <div style="display:flex;gap:8px">
    <a href="/robot" class="hbtn">&#x2190; Robot Performans</a>
    <a href="/" class="hbtn">&#x1F3E0; Ana Sayfa</a>
  </div>
</div>
<div class="container">
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-val" id="sOrtalama" style="color:#1a73e8">-</div><div class="stat-lbl">Tum Zamanlar Ort.</div></div>
    <div class="stat-card"><div class="stat-val" id="sMax" style="color:#16a34a">-</div><div class="stat-lbl">En Yuksek Gun</div></div>
    <div class="stat-card"><div class="stat-val" id="sMin" style="color:#dc2626">-</div><div class="stat-lbl">En Dusuk Gun</div></div>
    <div class="stat-card"><div class="stat-val" id="sGunSayisi" style="color:#888">-</div><div class="stat-lbl">Toplam Gun</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Tarih</th><th>Bakiye</th><th>Gunluk Degisim</th><th>Kaynak</th><th></th></tr></thead>
    <tbody id="tableBody"></tbody>
  </table>
</div>

<!-- Duzenle Modal -->
<div id="editModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center" onclick="if(event.target===this)closeEdit()">
  <div style="background:#fff;border-radius:12px;padding:24px;max-width:360px;width:90%">
    <h3 style="font-size:0.95rem;font-weight:600;margin-bottom:4px">Gunluk Degisim Duzenle</h3>
    <div id="editTarihLabel" style="font-size:0.78rem;color:#888;margin-bottom:16px"></div>
    <div style="margin-bottom:12px">
      <label style="font-size:0.75rem;color:#666;display:block;margin-bottom:4px">Gunluk Degisim %</label>
      <input type="number" step="0.001" id="editPctInput" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem" placeholder="ornek: -0.542">
    </div>
    <div style="background:#fef3c7;border-radius:6px;padding:8px 12px;font-size:0.75rem;color:#92400e;margin-bottom:16px">
      &#x26A0; Bu degisiklik sonraki tum gunlerin bakiyesini de gunceller (bilesik etki).
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="saveEdit()" style="flex:1;padding:8px;background:#1a73e8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.82rem;font-weight:600">Kaydet</button>
      <button onclick="closeEdit()" style="flex:0 0 auto;padding:8px 16px;background:#f3f4f6;color:#666;border:none;border-radius:6px;cursor:pointer;font-size:0.82rem">Iptal</button>
    </div>
  </div>
</div>

<script>
var DAILY_DATA=[["2024-01-01", 100000.0], ["2024-01-02", 107806.46], ["2024-01-03", 101487.67], ["2024-01-04", 103330.67], ["2024-01-05", 106614.43], ["2024-01-08", 114937.58], ["2024-01-09", 111130.76], ["2024-01-10", 115483.98], ["2024-01-11", 115473.88], ["2024-01-12", 113809.12], ["2024-01-15", 117940.64], ["2024-01-16", 119015.64], ["2024-01-17", 118245.89], ["2024-01-18", 117226.78], ["2024-01-19", 116816.08], ["2024-01-22", 117564.67], ["2024-01-23", 113711.1], ["2024-01-24", 112893.61], ["2024-01-25", 116830.08], ["2024-01-26", 124415.79], ["2024-01-29", 131723.39], ["2024-01-30", 133662.9], ["2024-01-31", 132524.84], ["2024-02-01", 135134.59], ["2024-02-02", 134691.0], ["2024-02-05", 135114.26], ["2024-02-06", 139417.21], ["2024-02-07", 140379.98], ["2024-02-08", 140296.71], ["2024-02-09", 139839.99], ["2024-02-12", 145948.23], ["2024-02-13", 139483.16], ["2024-02-14", 140835.86], ["2024-02-15", 144210.64], ["2024-02-16", 143738.75], ["2024-02-19", 143547.93], ["2024-02-20", 145086.31], ["2024-02-21", 144251.46], ["2024-02-22", 143669.15], ["2024-02-23", 144345.21], ["2024-02-26", 145232.75], ["2024-02-27", 144952.12], ["2024-02-28", 145114.32], ["2024-02-29", 145277.38], ["2024-03-01", 143476.85], ["2024-03-04", 142458.8], ["2024-03-05", 141921.84], ["2024-03-06", 142081.5], ["2024-03-07", 145848.66], ["2024-03-08", 148599.06], ["2024-03-11", 149308.4], ["2024-03-12", 147689.53], ["2024-03-13", 147304.84], ["2024-03-14", 147471.51], ["2024-03-15", 147638.76], ["2024-03-18", 148139.34], ["2024-03-19", 150247.08], ["2024-03-20", 150177.16], ["2024-03-21", 156493.66], ["2024-03-22", 156655.73], ["2024-03-25", 156468.29], ["2024-03-26", 153681.71], ["2024-03-27", 153720.54], ["2024-03-28", 155959.17], ["2024-03-29", 154602.82], ["2024-04-01", 153348.51], ["2024-04-02", 153939.41], ["2024-04-03", 152165.89], ["2024-04-04", 156359.37], ["2024-04-05", 165843.39], ["2024-04-08", 166179.3], ["2024-04-09", 166769.76], ["2024-04-15", 164085.21], ["2024-04-16", 161893.29], ["2024-04-17", 157182.62], ["2024-04-18", 157375.83], ["2024-04-19", 163006.39], ["2024-04-22", 159104.53], ["2024-04-24", 160684.36], ["2024-04-25", 157871.37], ["2024-04-26", 161259.63], ["2024-04-29", 167716.83], ["2024-04-30", 165248.47], ["2024-05-02", 167227.23], ["2024-05-03", 166297.04], ["2024-05-06", 164845.04], ["2024-05-07", 165905.38], ["2024-05-08", 162269.63], ["2024-05-09", 162196.27], ["2024-05-10", 159761.14], ["2024-05-13", 159636.07], ["2024-05-14", 157522.3], ["2024-05-15", 155207.37], ["2024-05-16", 157707.63], ["2024-05-17", 169037.93], ["2024-05-20", 173803.55], ["2024-05-21", 181542.98], ["2024-05-22", 177819.85], ["2024-05-23", 171581.58], ["2024-05-24", 170031.71], ["2024-05-27", 170584.49], ["2024-05-28", 170791.18], ["2024-05-29", 171018.13], ["2024-05-30", 171226.86], ["2024-05-31", 165911.42], ["2024-06-03", 165703.0], ["2024-06-04", 160735.29], ["2024-06-05", 161725.53], ["2024-06-06", 160950.67], ["2024-06-07", 161215.57], ["2024-06-10", 161789.38], ["2024-06-11", 161999.22], ["2024-06-12", 163051.18], ["2024-06-13", 165253.29], ["2024-06-14", 166343.95], ["2024-06-20", 169820.84], ["2024-06-21", 170362.78], ["2024-06-24", 170097.2], ["2024-06-25", 168108.28], ["2024-06-26", 167956.05], ["2024-06-27", 168499.86], ["2024-06-28", 168936.37], ["2024-07-01", 166624.84], ["2024-07-02", 166710.02], ["2024-07-03", 176374.8], ["2024-07-04", 179830.14], ["2024-07-05", 179089.19], ["2024-07-08", 178613.59], ["2024-07-09", 177252.17], ["2024-07-10", 177535.91], ["2024-07-11", 180578.35], ["2024-07-12", 180712.14], ["2024-07-16", 184260.44], ["2024-07-17", 183080.91], ["2024-07-18", 182353.63], ["2024-07-19", 181822.81], ["2024-07-22", 181474.64], ["2024-07-23", 180503.4], ["2024-07-24", 180547.04], ["2024-07-25", 180763.56], ["2024-07-26", 180975.13], ["2024-07-29", 181603.79], ["2024-07-30", 181812.55], ["2024-07-31", 182018.4], ["2024-08-01", 184692.5], ["2024-08-02", 180249.59], ["2024-08-05", 179263.61], ["2024-08-06", 179481.22], ["2024-08-07", 179701.21], ["2024-08-08", 180188.52], ["2024-08-09", 178033.64], ["2024-08-12", 176828.93], ["2024-08-13", 176777.61], ["2024-08-14", 171742.5], ["2024-08-15", 173954.59], ["2024-08-16", 168515.92], ["2024-08-19", 172714.42], ["2024-08-20", 172686.16], ["2024-08-21", 171718.76], ["2024-08-22", 172600.18], ["2024-08-23", 170950.95], ["2024-08-26", 171568.91], ["2024-08-27", 172107.51], ["2024-08-28", 170047.8], ["2024-08-29", 171148.11], ["2024-09-02", 178887.04], ["2024-09-03", 177190.69], ["2024-09-04", 176595.42], ["2024-09-05", 176686.33], ["2024-09-06", 176541.41], ["2024-09-09", 177197.55], ["2024-09-10", 177417.71], ["2024-09-11", 177636.23], ["2024-09-12", 177854.36], ["2024-09-13", 179841.04], ["2024-09-16", 178024.38], ["2024-09-17", 181559.03], ["2024-09-18", 182548.11], ["2024-09-19", 187975.11], ["2024-09-20", 188177.82], ["2024-09-23", 188641.34], ["2024-09-24", 194781.76], ["2024-09-25", 192803.99], ["2024-09-26", 190275.63], ["2024-09-27", 190897.78], ["2024-09-30", 191559.15], ["2024-10-01", 191810.42], ["2024-10-02", 192018.16], ["2024-10-03", 192247.1], ["2024-10-04", 192476.09], ["2024-10-07", 193167.48], ["2024-10-08", 191260.4], ["2024-10-09", 192865.13], ["2024-10-10", 188744.81], ["2024-10-11", 187645.25], ["2024-10-14", 187150.17], ["2024-10-15", 187019.68], ["2024-10-16", 190646.37], ["2024-10-17", 188577.82], ["2024-10-18", 185653.34], ["2024-10-21", 186122.36], ["2024-10-22", 183597.88], ["2024-10-23", 179624.49], ["2024-10-24", 179164.1], ["2024-10-25", 179115.29], ["2024-10-28", 179906.73], ["2024-10-30", 180675.73], ["2024-10-31", 177329.06], ["2024-11-01", 177289.46], ["2024-11-04", 176069.91], ["2024-11-05", 176265.01], ["2024-11-06", 177744.06], ["2024-11-07", 178905.38], ["2024-11-08", 190001.88], ["2024-11-11", 193976.68], ["2024-11-12", 192076.68], ["2024-11-13", 192513.74], ["2024-11-14", 193792.24], ["2024-11-15", 190885.29], ["2024-11-18", 190334.11], ["2024-11-19", 186797.63], ["2024-11-20", 186999.11], ["2024-11-21", 190223.16], ["2024-11-22", 199686.39], ["2024-11-25", 203212.95], ["2024-11-26", 200472.42], ["2024-11-27", 200192.32], ["2024-11-28", 200522.4], ["2024-11-29", 198155.11], ["2024-12-02", 199640.32], ["2024-12-03", 202612.57], ["2024-12-04", 201920.09], ["2024-12-05", 201916.81], ["2024-12-06", 203178.06], ["2024-12-09", 206210.39], ["2024-12-10", 201859.69], ["2024-12-11", 201394.94], ["2024-12-12", 201585.83], ["2024-12-13", 201809.98], ["2024-12-16", 200905.09], ["2024-12-17", 200905.25], ["2024-12-18", 199778.4], ["2024-12-19", 198883.42], ["2024-12-20", 199045.69], ["2024-12-23", 200681.23], ["2024-12-24", 201029.07], ["2024-12-25", 205724.42], ["2024-12-26", 204500.32], ["2024-12-27", 204177.41], ["2024-12-30", 203276.18], ["2024-12-31", 200316.85], ["2025-01-02", 201835.29], ["2025-01-03", 201333.43], ["2025-01-06", 202512.19], ["2025-01-07", 201399.46], ["2025-01-08", 201128.39], ["2025-01-09", 202466.1], ["2025-01-10", 198984.29], ["2025-01-13", 199767.92], ["2025-01-14", 200009.82], ["2025-01-15", 200252.17], ["2025-01-16", 197212.73], ["2025-01-17", 201542.4], ["2025-01-20", 202097.36], ["2025-01-21", 201903.16], ["2025-01-22", 204741.88], ["2025-01-23", 203272.92], ["2025-01-24", 204085.33], ["2025-01-27", 203321.41], ["2025-01-28", 205174.7], ["2025-01-29", 202139.15], ["2025-01-30", 200390.92], ["2025-01-31", 199405.44], ["2025-02-03", 199836.57], ["2025-02-04", 200070.66], ["2025-02-05", 200302.38], ["2025-02-06", 199935.69], ["2025-02-07", 201855.65], ["2025-02-10", 199004.54], ["2025-02-11", 198849.51], ["2025-02-12", 198905.46], ["2025-02-13", 199028.85], ["2025-02-14", 198129.25], ["2025-02-17", 198380.25], ["2025-02-18", 199160.9], ["2025-02-19", 196968.56], ["2025-02-20", 197576.74], ["2025-02-21", 196845.42], ["2025-02-24", 197683.46], ["2025-02-25", 197874.25], ["2025-02-26", 198483.98], ["2025-02-27", 203797.93], ["2025-02-28", 202635.6], ["2025-03-03", 216843.81], ["2025-03-04", 216077.38], ["2025-03-05", 225733.69], ["2025-03-06", 230543.68], ["2025-03-07", 228231.91], ["2025-03-10", 226829.87], ["2025-03-11", 227501.28], ["2025-03-12", 231827.35], ["2025-03-13", 232654.6], ["2025-03-14", 233483.92], ["2025-03-17", 232696.3], ["2025-03-18", 231931.12], ["2025-03-19", 228014.43], ["2025-03-20", 228224.67], ["2025-03-21", 228438.92], ["2025-03-24", 229111.29], ["2025-03-25", 234242.94], ["2025-03-26", 225001.67], ["2025-03-27", 223043.95], ["2025-03-28", 222959.62], ["2025-04-02", 222845.74], ["2025-04-03", 222744.91], ["2025-04-04", 222958.42], ["2025-04-07", 223615.92], ["2025-04-08", 220163.02], ["2025-04-09", 211828.66], ["2025-04-10", 206463.83], ["2025-04-11", 205458.74], ["2025-04-14", 203903.16], ["2025-04-15", 203525.63], ["2025-04-16", 203204.32], ["2025-04-17", 199481.23], ["2025-04-18", 200180.55], ["2025-04-21", 193883.12], ["2025-04-22", 194346.29], ["2025-04-24", 199669.27], ["2025-04-25", 196639.49], ["2025-04-28", 196509.07], ["2025-04-29", 196160.52], ["2025-04-30", 196362.61], ["2025-05-02", 197973.78], ["2025-05-05", 197855.81], ["2025-05-06", 196700.39], ["2025-05-07", 198571.25], ["2025-05-08", 201391.99], ["2025-05-09", 201659.68], ["2025-05-12", 210976.62], ["2025-05-13", 211665.34], ["2025-05-14", 212197.58], ["2025-05-15", 209622.87], ["2025-05-16", 210753.99], ["2025-05-20", 211305.89], ["2025-05-21", 211183.7], ["2025-05-22", 211551.64], ["2025-05-23", 211761.48], ["2025-05-26", 212428.12], ["2025-05-27", 212652.16], ["2025-05-28", 212876.49], ["2025-05-29", 213100.99], ["2025-05-30", 213325.69], ["2025-06-02", 214000.48], ["2025-06-03", 219294.92], ["2025-06-04", 222669.74], ["2025-06-05", 222743.18], ["2025-06-10", 230353.78], ["2025-06-11", 229260.32], ["2025-06-12", 225041.37], ["2025-06-13", 221905.42], ["2025-06-16", 222587.42], ["2025-06-17", 221422.98], ["2025-06-18", 219481.13], ["2025-06-19", 219693.01], ["2025-06-20", 219917.08], ["2025-06-23", 220580.92], ["2025-06-24", 218080.73], ["2025-06-25", 218539.83], ["2025-06-26", 214686.25], ["2025-06-27", 212924.5], ["2025-06-30", 248205.95], ["2025-07-01", 249917.41], ["2025-07-02", 257546.14], ["2025-07-03", 257751.4], ["2025-07-04", 258837.43], ["2025-07-07", 249916.82], ["2025-07-08", 251109.19], ["2025-07-09", 251738.99], ["2025-07-10", 259425.64], ["2025-07-11", 258714.74], ["2025-07-14", 258833.82], ["2025-07-16", 261521.14], ["2025-07-17", 265053.7], ["2025-07-18", 261785.71], ["2025-07-21", 274764.93], ["2025-07-22", 273653.84], ["2025-07-23", 274133.95], ["2025-07-24", 274865.53], ["2025-07-25", 273368.39], ["2025-07-28", 272845.13], ["2025-07-29", 272888.28], ["2025-07-30", 273134.7], ["2025-07-31", 274678.55], ["2025-08-01", 276303.17], ["2025-08-04", 281968.62], ["2025-08-05", 279665.15], ["2025-08-06", 280118.84], ["2025-08-07", 280005.01], ["2025-08-08", 279129.37], ["2025-08-11", 278636.12], ["2025-08-12", 276991.47], ["2025-08-13", 276593.42], ["2025-08-14", 274671.21], ["2025-08-15", 274909.04], ["2025-08-18", 275654.22], ["2025-08-19", 274932.37], ["2025-08-20", 282354.18], ["2025-08-21", 286595.1], ["2025-08-22", 287416.25], ["2025-08-25", 288764.83], ["2025-08-26", 287326.49], ["2025-08-27", 286032.41], ["2025-08-28", 286392.45], ["2025-08-29", 286649.58], ["2025-09-01", 285185.98], ["2025-09-02", 276094.61], ["2025-09-03", 276317.0], ["2025-09-04", 276567.61], ["2025-09-05", 276818.39], ["2025-09-08", 277571.2], ["2025-09-09", 277822.11], ["2025-09-10", 280173.49], ["2025-09-11", 273234.73], ["2025-09-12", 273457.73], ["2025-09-15", 297663.75], ["2025-09-16", 302782.35], ["2025-09-17", 302603.26], ["2025-09-18", 297951.38], ["2025-09-19", 301120.04], ["2025-09-22", 309125.78], ["2025-09-23", 306051.69], ["2025-09-24", 300721.6], ["2025-09-25", 301441.19], ["2025-09-26", 297918.94], ["2025-09-29", 297594.43], ["2025-09-30", 297844.16], ["2025-10-01", 302749.92], ["2025-10-02", 287997.71], ["2025-10-03", 280593.13], ["2025-10-06", 281308.74], ["2025-10-07", 281548.8], ["2025-10-08", 281789.13], ["2025-10-09", 282029.75], ["2025-10-10", 282270.35], ["2025-10-13", 282920.58], ["2025-10-14", 283161.12], ["2025-10-15", 283401.56], ["2025-10-16", 283642.56], ["2025-10-17", 283883.76], ["2025-10-20", 292356.31], ["2025-10-21", 296325.91], ["2025-10-22", 301811.02], ["2025-10-23", 296356.6], ["2025-10-24", 314684.83], ["2025-10-27", 308572.56], ["2025-10-28", 304630.92], ["2025-10-30", 301754.45], ["2025-10-31", 301920.52], ["2025-11-03", 308001.16], ["2025-11-04", 302593.33], ["2025-11-05", 293599.3], ["2025-11-06", 294884.66], ["2025-11-07", 286338.9], ["2025-11-10", 281968.62], ["2025-11-12", 282203.27], ["2025-11-13", 282438.04], ["2025-11-14", 282673.08], ["2025-11-17", 281449.05], ["2025-11-18", 277785.88], ["2025-11-19", 287469.16], ["2025-11-20", 290410.59], ["2025-11-21", 283178.58], ["2025-11-24", 281416.41], ["2025-11-25", 278016.9], ["2025-11-26", 280383.47], ["2025-11-27", 282116.99], ["2025-11-28", 278636.39], ["2025-12-01", 291584.99], ["2025-12-02", 285536.15], ["2025-12-03", 280996.19], ["2025-12-04", 277225.2], ["2025-12-05", 277443.85], ["2025-12-08", 278082.9], ["2025-12-09", 281334.84], ["2025-12-10", 272443.21], ["2025-12-11", 268492.61], ["2025-12-12", 270056.86], ["2025-12-15", 274541.44], ["2025-12-16", 270624.12], ["2025-12-17", 270812.54], ["2025-12-18", 271028.95], ["2025-12-19", 271245.43], ["2025-12-22", 270185.03], ["2025-12-23", 268984.51], ["2025-12-24", 267915.3], ["2025-12-25", 263933.07], ["2025-12-26", 262772.74], ["2025-12-29", 263244.52], ["2025-12-30", 263452.17], ["2025-12-31", 263216.14], ["2026-01-02", 279329.81], ["2026-01-05", 285143.26], ["2026-01-06", 298150.13], ["2026-01-07", 294415.82], ["2026-01-08", 291219.27], ["2026-01-09", 295451.93], ["2026-01-12", 296101.3], ["2026-01-13", 298639.62], ["2026-01-14", 295940.2], ["2026-01-15", 298354.33], ["2026-01-16", 306458.36], ["2026-01-19", 315564.34], ["2026-01-20", 317892.13], ["2026-01-21", 317018.86], ["2026-01-22", 305387.72], ["2026-01-23", 299289.41], ["2026-01-26", 304629.24], ["2026-01-27", 299057.67], ["2026-01-28", 304447.55], ["2026-01-29", 325233.83], ["2026-01-30", 328795.44], ["2026-02-02", 310969.65], ["2026-02-03", 321275.96], ["2026-02-04", 318456.52], ["2026-02-05", 311947.18], ["2026-02-06", 310668.78], ["2026-02-09", 313405.91], ["2026-02-10", 307738.57], ["2026-02-11", 306338.4], ["2026-02-12", 326435.37], ["2026-02-13", 324303.89], ["2026-02-16", 325232.09], ["2026-02-17", 318972.32], ["2026-02-18", 316837.99], ["2026-02-19", 313970.22], ["2026-02-20", 315625.11], ["2026-02-23", 314257.19], ["2026-02-24", 310849.33], ["2026-02-25", 305873.8], ["2026-02-26", 306089.49], ["2026-02-27", 301404.87], ["2026-03-02", 303024.92], ["2026-03-03", 301216.89]];
var splitIdx=DAILY_DATA.length;
var _editTarih=null;

async function init(){
  var dbRows=[];
  try{
    var r=await fetch("/api/robot-gunluk");
    dbRows=await r.json();
  }catch(e){}

  var liveAvgPct=0;
  try{
    var r2=await fetch("/api/musteriler");
    var data=await r2.json();
    if(data.length>0){
      var s=0;
      for(var i=0;i<data.length;i++) s+=parseFloat(data[i].bugun_yuzde)||0;
      liveAvgPct=s/data.length;
    }
  }catch(e){}

  var extData=DAILY_DATA.slice();
  var lastDbDate=extData[extData.length-1][0];
  for(var i=0;i<dbRows.length;i++){
    var d=dbRows[i].tarih.slice(0,10);
    if(d>lastDbDate){
      extData.push([d,parseFloat(dbRows[i].bakiye),dbRows[i].gunluk_pct,'db']);
      lastDbDate=d;
    }
  }
  var today=new Date();
  today.setHours(0,0,0,0);
  var todayStr=today.toISOString().slice(0,10);
  if(todayStr>lastDbDate && today.getDay()!==0 && today.getDay()!==6){
    var lastB=extData[extData.length-1][1];
    extData.push([todayStr,Math.round(lastB*(1+liveAvgPct/100)*100)/100,liveAvgPct,'canli']);
  }

  var fmt=function(n){return new Intl.NumberFormat('tr-TR').format(Math.round(n));};
  var sum=0,maxPct=-Infinity,minPct=Infinity,count=0;
  for(var i=1;i<extData.length;i++){
    var pct=(extData[i][1]/extData[i-1][1]-1)*100;
    sum+=pct;count++;
    if(pct>maxPct)maxPct=pct;
    if(pct<minPct)minPct=pct;
  }
  var ort=sum/count;
  document.getElementById('sOrtalama').textContent=(ort>=0?'+':'')+ort.toFixed(3)+'%';
  document.getElementById('sMax').textContent='+'+maxPct.toFixed(3)+'%';
  document.getElementById('sMin').textContent=minPct.toFixed(3)+'%';
  document.getElementById('sGunSayisi').textContent=(extData.length-1)+' gun';

  var html='';
  for(var j=extData.length-1;j>=1;j--){
    var pct2=(extData[j][1]/extData[j-1][1]-1)*100;
    var pctStr=pct2>=0?'<span class="pos">+'+pct2.toFixed(3)+'%</span>':'<span class="neg">'+pct2.toFixed(3)+'%</span>';
    var src=extData[j][3];
    var badge=src==='db'?'<span class="badge-db">Kaydedildi</span>'
             :src==='canli'?'<span class="badge-canli">Bugun canli</span>'
             :'<span class="badge-gecmis">Gecmis Veri</span>';
    // Sadece DB kayitlari duzenlenebilir
    var editBtn=src==='db'?'<button class="edit-btn" onclick="openEdit(''+extData[j][0]+'','+pct2.toFixed(4)+')">&#x270F; Duzenle</button>':'';
    html+='<tr><td style="color:#aaa">'+j+'</td><td>'+extData[j][0]+'</td><td>'+fmt(extData[j][1])+' TL</td><td>'+pctStr+'</td><td>'+badge+'</td><td>'+editBtn+'</td></tr>';
  }
  document.getElementById('tableBody').innerHTML=html;
}

function openEdit(tarih, mevcutPct){
  _editTarih=tarih;
  document.getElementById('editTarihLabel').textContent=tarih+' tarihli kayit';
  document.getElementById('editPctInput').value=mevcutPct.toFixed(4);
  document.getElementById('editModal').style.display='flex';
  document.getElementById('editPctInput').focus();
}

function closeEdit(){
  document.getElementById('editModal').style.display='none';
  _editTarih=null;
}

async function saveEdit(){
  if(!_editTarih) return;
  var pct=parseFloat(document.getElementById('editPctInput').value);
  if(isNaN(pct)){alert('Gecersiz deger');return;}
  try{
    var r=await fetch('/api/robot-gunluk/'+_editTarih+'/guncelle',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({gunluk_pct:pct})
    });
    var d=await r.json();
    if(d.ok){
      closeEdit();
      init(); // sayfayi yenile
    } else {
      alert('Hata: '+(d.error||'bilinmeyen'));
    }
  }catch(e){alert('Baglanti hatasi');}
}

init();
</script>
</body>
</html>`;
}

app.listen(PORT, () => console.log('Server port ' + PORT));
