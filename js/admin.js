const $ = (id) => document.getElementById(id);

let PW = sessionStorage.getItem('adminPw') || '';
if (!DEMO_MODE && !PW) { PW = prompt('Enter admin password:') || ''; sessionStorage.setItem('adminPw', PW); }

let roster = [];
let currentPresent = [];

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function api(params) {
  const url = BACKEND_URL + '?' + new URLSearchParams({ ...params, pw: PW });
  return fetch(url).then((r) => r.json());
}

async function loadRoster() {
  if (DEMO_MODE) { roster = DEMO_STUDENTS; return; }
  const data = await fetch(BACKEND_URL + '?action=roster').then((r) => r.json());
  roster = data.ok ? data.students : [];
}

async function loadCodeAndQR() {
  const code = DEMO_MODE ? DEMO_CODE : await api({ action: 'code' }).then((d) => (d.ok ? d.code : null));
  if (!code) return alert('Could not load today\'s code.');
  $('code').textContent = code;
  const checkinUrl = new URL('index.html', location.href).href + '?code=' + code;
  $('qr').innerHTML = '';
  new QRCode($('qr'), { text: checkinUrl, width: 180, height: 180 });
}

async function loadReport() {
  const date = $('date').value || todayISO();
  if (DEMO_MODE) {
    currentPresent = demoLoad().filter((r) => r.date === date).map((r) => ({ rollNo: r.rollNo, name: r.name }));
  } else {
    const data = await api({ action: 'report', date });
    if (!data.ok) return alert(data.error);
    currentPresent = data.records;
  }
  const presentRolls = new Set(currentPresent.map((r) => r.rollNo));
  const absent = roster.filter((s) => !presentRolls.has(s.rollNo));

  $('presentCount').textContent = currentPresent.length;
  $('absentCount').textContent = absent.length;
  $('presentList').innerHTML = currentPresent.map((r) => `<li>${r.rollNo} — ${r.name}</li>`).join('');
  $('absentList').innerHTML = absent.map((s) => `<li>${s.rollNo} — ${s.name}</li>`).join('');
}

function exportCsv() {
  const date = $('date').value || todayISO();
  const presentRolls = new Set(currentPresent.map((r) => r.rollNo));
  const rows = [['RollNo', 'Name', 'Status', 'Date']];
  currentPresent.forEach((r) => rows.push([r.rollNo, r.name, 'Present', date]));
  roster.filter((s) => !presentRolls.has(s.rollNo)).forEach((s) => rows.push([s.rollNo, s.name, 'Absent', date]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'attendance-' + date + '.csv';
  a.click();
}

$('date').value = todayISO();
$('refresh').addEventListener('click', loadReport);
$('export').addEventListener('click', exportCsv);

demoBanner();
(async function init() {
  await loadRoster();
  await loadCodeAndQR();
  await loadReport();
})();
