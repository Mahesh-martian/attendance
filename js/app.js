const $ = (id) => document.getElementById(id);

function setMsg(text, ok) {
  const el = $('msg');
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'err');
}

function getParam(name) {
  return new URLSearchParams(location.search).get(name) || '';
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
}

let idToken = null;

function decodeJwt(token) {
  try {
    const b = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(b).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(json);
  } catch (e) { return {}; }
}

// Called by Google Identity Services after a successful sign-in.
function handleCredential(response) {
  idToken = response.credential;
  const p = decodeJwt(idToken);
  $('identity').textContent = 'Signed in as ' + (p.name || p.email) + ' (' + p.email + ')';
  $('identity').style.display = 'block';
  setMsg('', true);
}
window.handleCredential = handleCredential;

function initSignIn() {
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
  google.accounts.id.renderButton($('gsi-button'), { theme: 'filled_blue', size: 'large', text: 'signin_with', width: 260 });
}

function fillStudents(students) {
  const sel = $('student');
  sel.innerHTML = '<option value="">Select your name…</option>';
  students.forEach((s) => {
    const o = document.createElement('option');
    o.value = s.rollNo;
    o.textContent = s.rollNo + ' — ' + s.name;
    o.dataset.name = s.name;
    sel.appendChild(o);
  });
}

async function markPresent() {
  const code = $('code').value.trim();
  if (code.length !== 4) return setMsg('Enter the 4-digit code.', false);

  if (DEMO_MODE) {
    const sel = $('student');
    if (!sel.value) return setMsg('Please select your name.', false);
    return demoMarkPresent(sel.value, sel.selectedOptions[0]?.dataset.name || '', code);
  }

  if (!idToken) return setMsg('Please sign in with Google first.', false);

  $('submit').disabled = true;
  setMsg('Marking…', true);
  try {
    const loc = await getLocation();
    const data = await fetch(BACKEND_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'checkin', idToken, code, lat: loc?.lat ?? null, lng: loc?.lng ?? null }),
    }).then((r) => r.json());
    setMsg(data.message || data.error, data.ok);
  } catch (e) {
    setMsg('Network error. Please try again.', false);
  } finally {
    $('submit').disabled = false;
  }
}

function demoMarkPresent(rollNo, name, code) {
  if (code !== DEMO_CODE) return setMsg('Wrong code. In demo the code is ' + DEMO_CODE + '.', false);
  const records = demoLoad();
  const today = demoTodayStr();
  if (records.some((r) => r.date === today && r.rollNo === rollNo))
    return setMsg('You already marked present today.', false);
  records.push({ date: today, rollNo, name });
  demoSave(records);
  setMsg('Attendance marked. Thank you, ' + name + '!', true);
}

function boot() {
  $('today').textContent = new Date().toDateString();
  $('code').value = getParam('code') || (DEMO_MODE ? DEMO_CODE : '');
  $('submit').addEventListener('click', markPresent);
  demoBanner();

  if (DEMO_MODE) {
    $('demoIdentity').style.display = 'block';
    fillStudents(DEMO_STUDENTS);
    return;
  }

  $('signinArea').style.display = 'block';
  const ready = setInterval(() => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      clearInterval(ready);
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.indexOf('PASTE_') === 0)
        setMsg('Google Sign-In is not configured. Add GOOGLE_CLIENT_ID in js/config.js.', false);
      else
        initSignIn();
    }
  }, 200);
}

boot();
