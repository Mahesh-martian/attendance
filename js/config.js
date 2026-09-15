// Paste your deployed Apps Script Web App URL here (it ends with /exec).
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbygWBQQ1ae7-w-hjhVP-5gjik745oHP9-4xnvxqJpo28seSd6ayWf1crpTOLUhSreHi/exec';

// Google OAuth Client ID (Web) for Sign-In. Create at console.cloud.google.com
// > APIs & Services > Credentials. Use the SAME value in backend/Code.gs (CLIENT_ID).
const GOOGLE_CLIENT_ID = '394782625197-h36khj5uonj1eu75dhilgph55rvegvab.apps.googleusercontent.com';

// Demo mode auto-activates while BACKEND_URL is unset, using sample data stored
// in the browser. It switches off automatically once a real URL is pasted above.
const DEMO_MODE = !BACKEND_URL || BACKEND_URL.indexOf('PASTE_') === 0;
const DEMO_CODE = '1234';
const DEMO_STUDENTS = [
  { rollNo: '01', name: 'Aarav Sharma' },
  { rollNo: '02', name: 'Diya Patel' },
  { rollNo: '03', name: 'Vihaan Reddy' },
  { rollNo: '04', name: 'Ananya Iyer' },
  { rollNo: '05', name: 'Arjun Nair' },
  { rollNo: '06', name: 'Saanvi Rao' },
  { rollNo: '07', name: 'Kabir Singh' },
  { rollNo: '08', name: 'Ishaan Gupta' },
  { rollNo: '09', name: 'Myra Joshi' },
  { rollNo: '10', name: 'Advait Kulkarni' },
];

function demoTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function demoLoad() {
  try { return JSON.parse(localStorage.getItem('demoAttendance') || '[]'); } catch (e) { return []; }
}
function demoSave(records) {
  localStorage.setItem('demoAttendance', JSON.stringify(records));
}
function demoBanner() {
  if (!DEMO_MODE || document.querySelector('.demo-banner')) return;
  const el = document.createElement('div');
  el.className = 'demo-banner';
  el.textContent = 'DEMO MODE — sample data in your browser. Paste your backend URL in js/config.js to go live.';
  document.body.prepend(el);
  document.body.classList.add('has-demo-banner');
}

// Seed a few present students for today on first run so the dashboard looks live.
if (DEMO_MODE && localStorage.getItem('demoAttendance') === null) {
  demoSave(DEMO_STUDENTS.slice(0, 6).map((s) => ({ date: demoTodayStr(), rollNo: s.rollNo, name: s.name })));
}
