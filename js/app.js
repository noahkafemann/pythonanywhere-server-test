const API_BASE = 'https://nkwinner.pythonanywhere.com';
const TOKEN_KEY = 'auth_token';

// ---------- DOM elements ----------
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');

const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authForm = document.getElementById('auth-form');
const authSubmit = document.getElementById('auth-submit');
const authError = document.getElementById('auth-error');
const authSwitch = document.getElementById('auth-switch');
const authToggleText = document.getElementById('auth-toggle-text');
const backToDashboard = document.getElementById('back-to-dashboard');

const logoutBtn = document.getElementById('logout-btn');
const dashboardUser = document.getElementById('dashboard-user');

const noteContent = document.getElementById('note-content');
const noteError = document.getElementById('note-error');
const newNoteBtn = document.getElementById('new-note-btn');
const loadingEl = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const notesList = document.getElementById('notes-list');

const toastEl = document.getElementById('toast');

// ---------- State ----------
let isRegisterMode = false;
let token = sessionStorage.getItem(TOKEN_KEY) || null;

// ---------- Helpers ----------
function showView(viewId) {
  document.querySelectorAll('.view').forEach((v) => v.hidden = true);
  document.getElementById(viewId).hidden = false;
}

function setLoading(el, loading) {
  if (!el) return;
  if (loading) {
    el.setAttribute('aria-busy', 'true');
  } else {
    el.removeAttribute('aria-busy');
  }
}

function showToast(message, type = 'error') {
  toastEl.textContent = message;
  toastEl.className = `toast ${type}`;
  toastEl.hidden = false;
  // force reflow
  void toastEl.offsetWidth;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => { toastEl.hidden = true; }, 300);
  }, 3500);
}

function setFormError(el, message) {
  if (!el) return;
  el.textContent = message || '';
  el.hidden = !message;
}

// ---------- API ----------
async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    throw new Error('Netzwerkfehler: Prüfe deine Internetverbindung.');
  }

  // Handle 401 -> invalid/expired session
  if (response.status === 401) {
    clearToken();
    showToast('Sitzung abgelaufen. Bitte melde dich erneut an.');
    showView('auth-view');
    throw new Error('Unauthorized');
  }

  let data;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    // Build a user-friendly message without leaking secrets/passwords/tokens
    let msg = `Fehler ${response.status}`;
    if (data && data.detail) msg = String(data.detail);
    else if (data && data.message) msg = String(data.message);
    else if (typeof data === 'string') msg = data;
    throw new Error(msg);
  }

  return data;
}

function clearToken() {
  token = null;
  sessionStorage.removeItem(TOKEN_KEY);
}

function setToken(newToken) {
  token = newToken;
  sessionStorage.setItem(TOKEN_KEY, newToken);
}

// ---------- Auth ----------
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  setFormError(authError, '');
  setLoading(authSubmit, true);

  try {
    const endpoint = isRegisterMode ? '/api/register' : '/api/login';
    const data = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      setToken(data.token);
      await loadUser();
      showView('dashboard-view');
      await loadNotes();
    } else {
      throw new Error('Unerwartete Antwort vom Server.');
    }
  } catch (err) {
    // Never log password/token
    setFormError(authError, err.message || 'Anmeldung fehlgeschlagen.');
    showToast(err.message || 'Anmeldung fehlgeschlagen.');
  } finally {
    setLoading(authSubmit, false);
  }
}

async function loadUser() {
  try {
    const data = await apiRequest('/api/me');
    const user = data.user || data;
    const email = user && user.email ? user.email : '';
    dashboardUser.textContent = email ? `Angemeldet als ${escapeHtml(email)}` : '';
  } catch (err) {
    // If /me fails, clear and go to auth
    clearToken();
    showView('auth-view');
  }
}

async function handleLogout() {
  try {
    await apiRequest('/api/logout', { method: 'POST' });
  } catch (err) {
    // ignore errors during logout; still clear local token
  } finally {
    clearToken();
    showView('auth-view');
    showToast('Erfolgreich abgemeldet.', 'success');
  }
}

// ---------- Notes ----------
async function loadNotes() {
  setLoading(loadingEl, true);
  emptyState.hidden = true;
  notesList.innerHTML = '';
  setFormError(noteError, '');

  try {
    const response = await apiRequest('/api/notes');
    const notes = response && response.notes ? response.notes : [];
    renderNotes(notes);
  } catch (err) {
    showToast(err.message || 'Notizen konnten nicht geladen werden.');
  } finally {
    setLoading(loadingEl, false);
  }
}

function renderNotes(notes) {
  notesList.innerHTML = '';

  if (!notes || notes.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  for (const note of notes) {
    const li = document.createElement('li');
    li.className = 'note-item';

    const contentSpan = document.createElement('span');
    contentSpan.className = 'note-content';
    // Safe rendering: textContent, never innerHTML
    contentSpan.textContent = note.content || '';

    const actions = document.createElement('div');
    actions.className = 'note-actions';

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-delete';
    delBtn.textContent = 'Löschen';
    delBtn.setAttribute('aria-label', `Notiz ${note.id} löschen`);
    delBtn.addEventListener('click', () => deleteNote(note.id));

    actions.appendChild(delBtn);
    li.appendChild(contentSpan);
    li.appendChild(actions);
    notesList.appendChild(li);
  }
}

async function createNote() {
  const content = noteContent.value.trim();

  if (!content) {
    setFormError(noteError, 'Bitte gib einen Notizinhalt ein.');
    return;
  }

  setFormError(noteError, '');
  setLoading(newNoteBtn, true);

  try {
    await apiRequest('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    const created = response && response.note ? response.note : response;
    noteContent.value = '';
    await loadNotes();
    showToast('Notiz gespeichert.', 'success');
  } catch (err) {
    showToast(err.message || 'Notiz konnte nicht gespeichert werden.');
  } finally {
    setLoading(newNoteBtn, false);
  }
}

async function deleteNote(id) {
  if (!confirm('Diese Notiz wirklich löschen?')) return;

  try {
    await apiRequest(`/api/notes/${id}`, { method: 'DELETE' });
    await loadNotes();
    showToast('Notiz gelöscht.', 'success');
  } catch (err) {
    showToast(err.message || 'Notiz konnte nicht gelöscht werden.');
  }
}

// ---------- Escape helper (defense in depth, though we use textContent) ----------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---------- Init ----------
authForm.addEventListener('submit', handleAuthSubmit);

authSwitch.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  if (isRegisterMode) {
    authTitle.textContent = 'Konto erstellen';
    authSubtitle.textContent = 'Registriere dich für ein neues Konto.';
    authSubmit.textContent = 'Konto erstellen';
    authToggleText.textContent = 'Bereits registriert?';
    authSwitch.textContent = 'Anmelden';
  } else {
    authTitle.textContent = 'Willkommen';
    authSubtitle.textContent = 'Melde dich an oder erstelle ein Konto.';
    authSubmit.textContent = 'Anmelden';
    authToggleText.textContent = 'Noch kein Konto?';
    authSwitch.textContent = 'Konto erstellen';
  }
  setFormError(authError, '');
});

backToDashboard.addEventListener('click', () => {
  if (token) {
    showView('dashboard-view');
  } else {
    showView('auth-view');
  }
});

logoutBtn.addEventListener('click', handleLogout);

newNoteBtn.addEventListener('click', createNote);

// Allow Enter in textarea with Ctrl+Enter to submit
noteContent.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    createNote();
  }
});

// Bootstrap
(function bootstrap() {
  if (token) {
    loadUser().then(() => {
      if (token) showView('dashboard-view');
      else showView('auth-view');
    }).catch(() => showView('auth-view'));
  } else {
    showView('auth-view');
  }
})();
