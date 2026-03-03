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
    ['7195802', 273114,  273114,  25, 'TL',  false, null, null, null],
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
    ['7235569', 250000,  250000,  25, 'TL',  false, null, null, null],
    ['53659',   250000,  250000,  25, 'TL',  false, '193.38.34.128',      'administrator', 'Zeynep180925'],
    ['7236189', 150000,  150000,  25, 'TL',  false, '78.135.87.117',      'administrator', 'Mursel190925'],
    ['7236065', 350000,  350000,  25, 'TL',  false, '78.135.87.98',       'administrator', 'Okan190925'],
    ['7152100', 400000,  400000,  25, 'TL',  false, '78.135.87.254',      'administrator', 'Elif190925'],
    ['7192610', 350499,  350499,  25, 'TL',  false, '78.135.87.72',       'administrator', 'Derya240925'],
    ['7236029', 250000,  250000,  25, 'TL',  false, '77.92.154.85',       'administrator', 'Serkan180925'],
    ['7236134', 327430,  327430,  25, 'TL',  false, '193.38.34.176',      'administrator', 'Engin031025'],
    ['7236469', 250933,  250933,  25, 'TL',  false, '193.38.34.11',       'administrator', 'Mustafa061025'],
    ['7231923', 850249,  850249,  25, 'TL',  false, null, null, null],
    ['7237612', 273386,  273386,  25, 'TL',  false, '193.38.34.12',       'administrator', 'Serkan101025'],
    ['7237528', 601262,  601262,  25, 'TL',  false, '77.92.154.194',      'administrator', 'Levent131025'],
    ['7237754', 990577,  990577,  20, 'TL',  false, '193.38.34.70',       'administrator', 'Onur101425'],
    ['7237833', 250000,  250000,  25, 'TL',  false, '77.92.154.94',       'administrator', 'Ali141025'],
    ['7237217', 250000,  250000,  25, 'TL',  false, '77.92.154.49',       'administrator', 'Caglar151025'],
    ['7237815', 288013,  288013,  25, 'TL',  false, null, null, null],
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

initDB().then(() => syncRdpData());

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
    const { baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif, rdp_ip, rdp_kullanici, rdp_sifre } = req.body;
    await pool.query(
      'UPDATE musteri_kayit SET baslangic_parasi=$1, hakedis_miktari=$2, komisyon_orani=$3, para_birimi=$4, es_dost=$5, aktif=$6, rdp_ip=$7, rdp_kullanici=$8, rdp_sifre=$9 WHERE hesap_no=$10',
      [baslangic_parasi, hakedis_miktari, komisyon_orani, para_birimi, es_dost, aktif, rdp_ip||null, rdp_kullanici||null, rdp_sifre||null, hesap_no]
    );
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
             k.baslangic_parasi, k.komisyon_orani, k.para_birimi, k.es_dost, k.aktif, k.created_at
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

    const headers = ['Hesap No','Isim','Para Birimi','Varlik','Baslangic Parasi','Komisyon Orani %','Komisyon TL','Bugun Kar','Bugun %','Acik Pozisyon','Es Dost','Aktif','Son Guncelleme','Kayit Tarihi'];
    const csvRows = rows.map(c => {
      const komisyon = calcKom(c);
      return [
        c.hesap_no, c.isim||'', c.para_birimi||'TL',
        c.varlik||'', c.baslangic_parasi||'', c.komisyon_orani||'',
        komisyon > 0 ? Math.round(komisyon) : '',
        c.bugun_kar||'', c.bugun_yuzde||'', c.acik_pozisyon||'',
        c.es_dost ? 'Evet' : 'Hayir',
        c.aktif !== false ? 'Evet' : 'Hayir',
        c.son_guncelleme ? new Date(c.son_guncelleme).toLocaleString('tr-TR') : '',
        c.created_at ? new Date(c.created_at).toLocaleString('tr-TR') : ''
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
  </style>
</head>
<body>
  <div class="header">
    <h1>Musteri Takip Paneli</h1>
    <div class="market-status" id="marketStatus">Piyasa durumu yukleniyor...</div>
    <div class="header-btns">
      <a href="/musteriler" class="header-btn">👥 Musteriler</a>
      <a href="/api/export" class="header-btn">📥 Excel</a>
      <button class="header-btn" onclick="showSettings()">⚙️</button>
    </div>
  </div>

  <div class="stats">
    <div class="stat-card"><div class="stat-value" id="totalCustomers">-</div><div class="stat-label">Musteri</div></div>
    <div class="stat-card"><div class="stat-value" id="activeCustomers">-</div><div class="stat-label">Aktif</div></div>
    <div class="stat-card"><div class="stat-value" id="totalBalance">-</div><div class="stat-label">Toplam Varlik</div></div>
    <div class="stat-card"><div class="stat-value" id="todayProfit">-</div><div class="stat-label">Bugun Kar</div></div>
    <div class="stat-card"><div class="stat-value" id="avgPct">-</div><div class="stat-label">Ort %</div></div>
    <div class="stat-card"><div class="stat-value" id="komisyon">-</div><div class="stat-label">Komisyon</div></div>
  </div>

  <div class="alerts" id="alerts"></div>
  <div class="last-update">Son: <span id="lastUpdate">-</span> | Kur: <span id="kurInfo">-</span></div>

  <div class="container">
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
        const todayProfit=allData.reduce((s,c)=>s+(parseFloat(c.bugun_kar)||0),0);
        const avgPct=allData.length>0?allData.reduce((s,c)=>s+(parseFloat(c.bugun_yuzde)||0),0)/allData.length:0;
        const totalKomisyon=allData.reduce((s,c)=>s+calcKomisyon(c),0);
        document.getElementById('totalCustomers').textContent=allData.length+'/'+kayitliData.filter(k=>k.aktif!==false).length;
        document.getElementById('activeCustomers').textContent=MARKET_OPEN?activeCount:'-';
        document.getElementById('totalBalance').textContent=formatMoney(totalBalance);
        document.getElementById('todayProfit').textContent=(todayProfit>=0?'+':'')+formatMoney(todayProfit);
        document.getElementById('todayProfit').className='stat-value '+(todayProfit>=0?'positive':'negative');
        document.getElementById('avgPct').textContent=(avgPct>=0?'+':'')+avgPct.toFixed(2)+'%';
        document.getElementById('avgPct').className='stat-value '+(avgPct>=0?'positive':'negative');
        document.getElementById('komisyon').textContent=(totalKomisyon>=0?'+':'')+formatMoney(totalKomisyon);
        document.getElementById('komisyon').className='stat-value '+(totalKomisyon>=0?'positive':'negative');
        document.getElementById('lastUpdate').textContent=new Date().toLocaleString('tr-TR');
        document.getElementById('kurInfo').textContent='$1 = '+DOLAR_KURU.toFixed(2)+' TL';
        const majPos=getMajorityPosition(allData);
        const posIssues=allData.filter(c=>(c.acik_pozisyon||0)!==majPos);
        const {mean,stdDev}=getStdDev(allData);
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
          if(alertsHtml==='')alertsHtml='<button class="alert-btn success">✓ Normal</button>';
        }else{
          alertsHtml='<button class="alert-btn info">🌙 Piyasa Kapali - Kontrol Pasif</button>';
          if(posIssues.length>0)alertsHtml+='<button class="alert-btn warning" onclick="showPosIssues()">📊 Poz: '+posIssues.length+'</button>';
          if(outliers.length>0)alertsHtml+='<button class="alert-btn warning" onclick="showOutliers()">📈 Sapma: '+outliers.length+'</button>';
        }
        document.getElementById('alerts').innerHTML=alertsHtml;
        const tbody=document.getElementById('customerTable');
        if(allData.length===0){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:30px">Veri bekleniyor...</td></tr>';return;}
        tbody.innerHTML=allData.map(c=>{
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
      } catch(err){console.error(err);}
    }
    function showInactive(){showModal('Pasif (65+ dk)',allData.filter(c=>!isActive(c.son_guncelleme)).map(c=>(c.isim||'-')+' (#'+c.hesap_no+')'));}
    function showPosIssues(){const maj=getMajorityPosition(allData);showModal('Pozisyon Farki',allData.filter(c=>(c.acik_pozisyon||0)!==maj).map(c=>(c.isim||'-')+' - Acik: '+(c.acik_pozisyon||0)+' (gereken: '+maj+')'));}
    function showOutliers(){const {mean}=getStdDev(allData);showModal('Kar Sapmasi',allData.filter(c=>Math.abs((parseFloat(c.bugun_yuzde)||0)-mean)>getStdDev(allData).stdDev*2).map(c=>(c.isim||'-')+' - '+(parseFloat(c.bugun_yuzde)||0).toFixed(2)+'% (ort: '+mean.toFixed(2)+'%)'));}
    function showGelmeyenler(){const gelenIDs=allData.map(m=>m.hesap_no);showModal('Veri Gelmeyen Musteriler',kayitliData.filter(k=>k.aktif!==false&&!gelenIDs.includes(k.hesap_no)).map(k=>'#'+k.hesap_no));}
    loadData();
    setInterval(loadData,30000);
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
    .rdp-btn{display:inline-flex;align-items:center;gap:4px;background:#0ea5e9;color:#fff;border:none;border-radius:6px;padding:5px 12px;font-size:0.72rem;cursor:pointer;margin-top:8px;text-decoration:none}
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
      // data attribute ile ozel karakterleri guvende tut
      const ip = (c.rdp_ip||'').replace(/"/g,'&quot;');
      const user = (c.rdp_kullanici||'').replace(/"/g,'&quot;');
      const sifre = (c.rdp_sifre||'').replace(/"/g,'&quot;');
      return '<button class="rdp-btn" ' +
             'data-ip="'+ip+'" data-user="'+user+'" data-sifre="'+sifre+'" ' +
             'onclick="event.stopPropagation();copyRdp(this)">🖥️ ' + (c.rdp_ip) + '</button>';
    }

    function copyRdp(btn) {
      const ip = btn.dataset.ip;
      const sifre = btn.dataset.sifre;
      const orig = btn.innerHTML;
      navigator.clipboard.writeText(ip).then(() => {
        btn.innerHTML = '✅ IP kopyalandi!';
        btn.style.background = '#16a34a';
        if (sifre) {
          setTimeout(() => {
            navigator.clipboard.writeText(sifre);
            btn.innerHTML = '🔑 Sifre kopyalandi!';
            btn.style.background = '#7c3aed';
            setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 1500);
          }, 1500);
        } else {
          setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 1500);
        }
      }).catch(() => {
        prompt('IP adresini kopyala:', ip);
      });
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
          '</div>';
        }
        return '<div class="'+cardClass+'" onclick="openEditModal(cardDataMap['+i+'])">' +
          '<div class="card-header"><div><div class="card-name">'+(c.isim||'#'+c.hesap_no)+'</div><div class="card-id">#'+c.hesap_no+' · '+(c.para_birimi||'TL')+'</div></div>'+
          '<span class="card-badge'+(c.es_dost?' es-dost-badge':'')+'">'+statusText+'</span></div>'+
          '<div class="card-stats">'+
            '<div class="card-stat"><div class="card-stat-value">'+formatMoney(c.varlik)+'</div><div class="card-stat-label">Varlik</div></div>'+
            '<div class="card-stat"><div class="card-stat-value '+(bugunKar>=0?'positive':'negative')+'">'+(bugunKar>=0?'+':'')+formatMoney(bugunKar)+'</div><div class="card-stat-label">Bugun</div></div>'+
            '<div class="card-stat"><div class="card-stat-value '+(komisyon>=0?'positive':'negative')+'">'+(c.es_dost?'-':formatMoney(komisyon))+'</div><div class="card-stat-label">Komisyon</div></div>'+
          '</div>'+
          '<div class="card-footer"><span>Baslangic: '+formatMoney(c.baslangic_parasi||0)+' '+(c.para_birimi||'TL')+'</span><span>%'+bugunPct.toFixed(2)+' bugun</span></div>'+
          makeRdpLink(c)+
        '</div>';
      }).join('');
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
        rdp_sifre:document.getElementById('editRdpSifre').value||null
      };
      try{
        const res=await fetch('/api/kayit/'+hesap_no,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
        if(res.ok){closeEditModal();await loadData();}else alert('Kayit sirasinda hata olustu!');
      }catch(e){alert('Baglanti hatasi!');}
    }

    async function loadData(){
      try{
        const [mRes,kayitliRes,kurRes]=await Promise.all([fetch('/api/musteriler'),fetch('/api/kayitli'),fetch('/api/kur')]);
        const mData=await mRes.json();
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

    loadData();
    setInterval(loadData,60000);
  </script>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server port ' + PORT));
