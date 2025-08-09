// Full Moon House Finder — 2025
// Loads JSON, computes house based on chosen system + rising, shows meanings.

const SIGNS = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
];

// Lahiri ayanāṃśa (approx for 2025). You can fine-tune if desired.
const AYANAMSA_LAHIRI_2025 = 24.1; // degrees
const NAK_LENGTH = 13 + 20/60; // 13°20'

const els = {
  system: { trop: document.getElementById('sys-tropical'), sid: document.getElementById('sys-sidereal') },
  rising: document.getElementById('rising'),
  date: document.getElementById('fm-date'),
  out: document.getElementById('output'),
  houseTitle: document.getElementById('house-title'),
  signLine: document.getElementById('sign-line'),
  houseMeaning: document.getElementById('house-meaning'),
  moreBtn: document.getElementById('more-btn'),
  morePanel: document.getElementById('more-panel'),
  siderealOnly: document.getElementById('sidereal-only'),
  nakLine: document.getElementById('nakshatra-line'),
  nakMeaning: document.getElementById('nakshatra-meaning'),
  extras: document.getElementById('extras-list')
};

let DB = { fullmoons: [], houses: {}, nakshatras: [] };

init();

async function init(){
  // populate selects
  SIGNS.forEach((s, i)=>{
    const opt = new Option(s, i); els.rising.add(opt);
  });

  // load data
  const [fm, houses, naks] = await Promise.all([
    fetch('data/fullmoons.json').then(r=>r.json()),
    fetch('data/houses.json').then(r=>r.json()),
    fetch('data/nakshatras.json').then(r=>r.json()),
  ]);
  DB.fullmoons = fm; DB.houses = houses; DB.nakshatras = naks;

  // full moon dates
  fm.forEach((row)=>{
    const label = new Date(row.date).toLocaleDateString(undefined,{weekday:'short', year:'numeric', month:'short', day:'numeric'});
    const opt = new Option(label, row.date);
    els.date.add(opt);
  });

  // events
  document.querySelectorAll('input[name="system"]').forEach(r=>r.addEventListener('change', compute));
  els.rising.addEventListener('change', compute);
  els.date.addEventListener('change', compute);
  els.moreBtn.addEventListener('click', ()=>{
    const expanded = els.moreBtn.getAttribute('aria-expanded') === 'true';
    els.moreBtn.setAttribute('aria-expanded', String(!expanded));
    els.morePanel.classList.toggle('hidden');
  });

  // default picks
  els.rising.value = 0; // Aries
  els.date.selectedIndex = 0;
  compute();
}

function compute(){
  const system = document.querySelector('input[name="system"]:checked').value; // tropical|sidereal
  const risingIndex = Number(els.rising.value);
  const row = DB.fullmoons.find(r=>r.date === els.date.value);
  if(!row) return;

  // Build tropical absolute longitude from sign + degree
  const tSignIndex = SIGNS.indexOf(row.tropical.sign);
  const tLon = tSignIndex * 30 + row.tropical.degree; // 0..360

  let useSignIndex = tSignIndex;
  let useLon = tLon;
  let sid = null;

  if(system === 'sidereal'){
    let sLon = tLon - AYANAMSA_LAHIRI_2025; // crude but serviceable
    while(sLon < 0) sLon += 360; // normalize
    sLon = sLon % 360;
    useLon = sLon;
    useSignIndex = Math.floor(sLon / 30);

    // Nakshatra
    const nakIndex = Math.floor(sLon / NAK_LENGTH); // 0..26
    sid = { nakIndex, nak: DB.nakshatras[nakIndex] };
  }

  // Determine house of the Full Moon sign for chosen rising
  // House = 1 + (signIndex - risingIndex + 12) % 12
  const house = 1 + ((useSignIndex - risingIndex + 12) % 12);

  // UI fill
  els.out.classList.remove('hidden');
  const sysLabel = system === 'sidereal' ? 'Sidereal' : 'Tropical';
  els.houseTitle.textContent = `House ${house}`;
  els.signLine.textContent = `${sysLabel} Moon in ${SIGNS[useSignIndex]}` + (system==='sidereal' ? ` · ${fmtDeg(useLon % 30)} of the sign` : '');
  els.houseMeaning.textContent = DB.houses[String(house)] || '';

  // More info block
  els.extras.innerHTML = '';
  const num = numerology(new Date(row.date));
  addBullet(`Numerology (date): ${num.description}`);
  addBullet(`Peak time (source tz): ${row.tropical.time || '—'}`);

  if(system === 'sidereal' && sid){
    els.siderealOnly.classList.remove('hidden');
    els.nakLine.textContent = `${sid.nak.index+1}. ${sid.nak.name} — symbol: ${sid.nak.symbol}`;
    els.nakMeaning.textContent = sid.nak.meaning;
  } else {
    els.siderealOnly.classList.add('hidden');
  }
}

function addBullet(text){
  const li = document.createElement('li');
  li.textContent = text; els.extras.appendChild(li);
}

function fmtDeg(d){
  return `${d.toFixed(2)}°`;
}

function numerology(d){
  const sum = [...d.toISOString().slice(0,10).replace(/-/g,'')].reduce((a,c)=>a+Number(c),0);
  const reduce = (n)=>{ while(n>9) n = String(n).split('').reduce((a,c)=>a+Number(c),0); return n; };
  const life = reduce(sum);
  const map = {
    1:'initiate / start fresh',
    2:'partnerships & balance',
    3:'expression & creativity',
    4:'structure & discipline',
    5:'change & movement',
    6:'care, duty, harmony',
    7:'insight & spirituality',
    8:'power, finances, results',
    9:'completion & release'
  };
  return { number: life, description: `${life} — ${map[life]}` };
}
