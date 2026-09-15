const $ = (id) => document.getElementById(id);

let PW = sessionStorage.getItem('adminPw') || '';
if (!DEMO_MODE && !PW) { PW = prompt('Enter admin password:') || ''; sessionStorage.setItem('adminPw', PW); }

let roster = [];
let classes = [];
let currentPresent = [];
let editingId = null;

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function apiGet(params) {
  const url = BACKEND_URL + '?' + new URLSearchParams({ ...params, pw: PW });
  return fetch(url).then((r) => r.json());
}
async function apiPost(body) {
  return fetch(BACKEND_URL, { method: 'POST', body: JSON.stringify({ ...body, pw: PW }) }).then((r) => r.json());
}

async function loadRoster() {
  if (DEMO_MODE) { roster = DEMO_STUDENTS.map((s) => ({ ...s, subjects: ['Java', 'Python'] })); return; }
  const data = await fetch(BACKEND_URL + '?action=roster').then((r) => r.json());
  roster = data.ok ? data.students : [];
}

async function loadClasses() {
  if (DEMO_MODE) {
    classes = DEMO_CLASSES.slice();
  } else {
    const data = await apiGet({ action: 'classesadmin' });
    classes = data.ok ? data.classes : [];
  }
  renderClasses();
  fillSubjectFilter();
}

function fillSubjectFilter() {
  const sel = $('subjectFilter');
  const cur = sel.value;
  const active = classes.filter((c) => c.active);
  sel.innerHTML = '<option value="">All subjects</option>' + active.map((c) => `<option value="${c.subject}">${c.subject}</option>`).join('');
  sel.value = cur;
}

function renderClasses() {
  $('classesBody').innerHTML = classes.map((c) => `
    <tr>
      <td>${c.subject}</td><td>${c.startTime}</td><td>${c.endTime}</td><td>${c.days}</td>
      <td>${c.active ? '✔' : '—'}</td>
      <td>
        <button class="link" data-edit="${c.classId}">Edit</button>
        <button class="link danger" data-del="${c.classId}">Delete</button>
      </td>
    </tr>`).join('');
  $('classesBody').querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => startEdit(b.dataset.edit)));
  $('classesBody').querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => delClass(b.dataset.del)));
}

function startEdit(id) {
  const c = classes.find((x) => x.classId === id);
  if (!c) return;
  editingId = id;
  $('cSubject').value = c.subject;
  $('cStart').value = c.startTime;
  $('cEnd').value = c.endTime;
  $('cDays').value = c.days;
  $('cActive').checked = c.active;
  $('cSave').textContent = 'Update class';
  $('cCancel').style.display = '';
}

function cancelEdit() {
  editingId = null;
  $('cSubject').value = ''; $('cStart').value = ''; $('cEnd').value = ''; $('cDays').value = ''; $('cActive').checked = true;
  $('cSave').textContent = 'Add class';
  $('cCancel').style.display = 'none';
}

async function saveClass() {
  const body = {
    subject: $('cSubject').value.trim(),
    startTime: $('cStart').value,
    endTime: $('cEnd').value,
    days: $('cDays').value.trim() || 'All',
    active: $('cActive').checked,
  };
  if (!body.subject || !body.startTime || !body.endTime) return alert('Subject, start and end are required.');
  if (DEMO_MODE) return alert('Managing classes works once your backend is connected (live mode).');
  const res = editingId
    ? await apiPost({ action: 'updateClass', classId: editingId, ...body })
    : await apiPost({ action: 'addClass', ...body });
  if (!res.ok) return alert(res.error || 'Failed to save.');
  cancelEdit();
  await loadClasses();
}

async function delClass(id) {
  if (!confirm('Delete this class?')) return;
  if (DEMO_MODE) return alert('Managing classes works in live mode.');
  const res = await apiPost({ action: 'deleteClass', classId: id });
  if (!res.ok) return alert(res.error || 'Failed to delete.');
  await loadClasses();
}

async function loadCodeAndQR() {
  const code = DEMO_MODE ? DEMO_CODE : await apiGet({ action: 'code' }).then((d) => (d.ok ? d.code : null));
  if (!code) return alert('Could not load today\'s code.');
  $('code').textContent = code;
  const checkinUrl = new URL('index.html', location.href).href + '?code=' + code;
  $('qr').innerHTML = '';
  new QRCode($('qr'), { text: checkinUrl, width: 180, height: 180 });
}

async function loadReport() {
  const date = $('date').value || todayISO();
  const subject = $('subjectFilter').value;
  if (DEMO_MODE) {
    currentPresent = demoLoad().filter((r) => r.date === date && (!subject || r.subject === subject)).map((r) => ({ rollNo: r.rollNo, name: r.name }));
  } else {
    const data = await apiGet({ action: 'report', date, subject });
    if (!data.ok) return alert(data.error);
    currentPresent = data.records;
  }
  const presentRolls = new Set(currentPresent.map((r) => r.rollNo));
  const enrolled = subject
    ? roster.filter((s) => (s.subjects || []).some((x) => x.toLowerCase() === subject.toLowerCase()))
    : roster;
  const absent = enrolled.filter((s) => !presentRolls.has(s.rollNo));

  $('presentCount').textContent = currentPresent.length;
  $('absentCount').textContent = absent.length;
  $('presentList').innerHTML = currentPresent.map((r) => `<li>${r.rollNo} — ${r.name}</li>`).join('');
  $('absentList').innerHTML = absent.map((s) => `<li>${s.rollNo} — ${s.name}</li>`).join('');
}

function exportCsv() {
  const date = $('date').value || todayISO();
  const subject = $('subjectFilter').value;
  const label = subject || 'All';
  const presentRolls = new Set(currentPresent.map((r) => r.rollNo));
  const enrolled = subject
    ? roster.filter((s) => (s.subjects || []).some((x) => x.toLowerCase() === subject.toLowerCase()))
    : roster;
  const rows = [['RollNo', 'Name', 'Subject', 'Status', 'Date']];
  currentPresent.forEach((r) => rows.push([r.rollNo, r.name, label, 'Present', date]));
  enrolled.filter((s) => !presentRolls.has(s.rollNo)).forEach((s) => rows.push([s.rollNo, s.name, label, 'Absent', date]));
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = 'attendance-' + label + '-' + date + '.csv';
  a.click();
}

$('date').value = todayISO();
$('refresh').addEventListener('click', loadReport);
$('export').addEventListener('click', exportCsv);
$('subjectFilter').addEventListener('change', loadReport);
$('cSave').addEventListener('click', saveClass);
$('cCancel').addEventListener('click', cancelEdit);

demoBanner();
(async function init() {
  await loadRoster();
  await loadClasses();
  await loadCodeAndQR();
  await loadReport();
})();
