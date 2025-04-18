// DOM Elements
const authForm = document.getElementById('authForm');
const authenticatedUI = document.getElementById('authenticatedUI');
const loginForm = document.getElementById('loginForm');
const userEmail = document.getElementById('userEmail');
const errorMessage = document.getElementById('errorMessage');
const cookieList = document.getElementById('cookieList');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const logoutBtn = document.getElementById('logoutBtn');

// State
let currentUser = null;
let cookies = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Check if user is authenticated
    const session = await chrome.storage.local.get(['session']);
    if (session && session.session) {
      currentUser = session.session.user;
      showAuthenticatedUI();
      loadCookies();
    } else {
      showAuthForm();
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showError('Failed to initialize popup');
  }
});

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
exportBtn.addEventListener('click', handleExport);
importBtn.addEventListener('click', handleImport);
logoutBtn.addEventListener('click', handleLogout);

// UI Functions
function showAuthForm() {
  authForm.style.display = 'block';
  authenticatedUI.style.display = 'none';
  errorMessage.textContent = '';
}

function showAuthenticatedUI() {
  authForm.style.display = 'none';
  authenticatedUI.style.display = 'block';
  userEmail.textContent = currentUser.email;
  errorMessage.textContent = '';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

// Authentication Functions
async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    await chrome.storage.local.set({ session: data });
    currentUser = data.user;
    showAuthenticatedUI();
    loadCookies();
  } catch (error) {
    console.error('Login error:', error);
    showError('Invalid email or password');
  }
}

async function handleLogout() {
  try {
    await chrome.storage.local.remove(['session']);
    currentUser = null;
    cookies = [];
    showAuthForm();
  } catch (error) {
    console.error('Logout error:', error);
    showError('Failed to logout');
  }
}

// Cookie Management Functions
async function loadCookies() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    const response = await fetch(`http://localhost:3000/api/cookies/${tab.id}`, {
      headers: {
        'Authorization': `Bearer ${currentUser.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load cookies');
    }

    cookies = await response.json();
    renderCookies();
  } catch (error) {
    console.error('Load cookies error:', error);
    showError('Failed to load cookies');
  }
}

function renderCookies() {
  cookieList.innerHTML = '';
  
  if (cookies.length === 0) {
    cookieList.innerHTML = '<p>No cookies found</p>';
    return;
  }

  cookies.forEach(cookie => {
    const cookieElement = document.createElement('div');
    cookieElement.className = 'cookie-item';
    cookieElement.innerHTML = `
      <div class="cookie-name">${cookie.name}</div>
      <div class="cookie-value">${cookie.value}</div>
    `;
    cookieList.appendChild(cookieElement);
  });
}

async function handleExport() {
  try {
    const blob = new Blob([JSON.stringify(cookies, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cookies.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Export error:', error);
    showError('Failed to export cookies');
  }
}

async function handleImport() {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const importedCookies = JSON.parse(e.target.result);
          
          const response = await fetch('http://localhost:3000/api/cookies/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser.token}`,
            },
            body: JSON.stringify({ cookies: importedCookies }),
          });

          if (!response.ok) {
            throw new Error('Import failed');
          }

          await loadCookies();
        } catch (error) {
          console.error('Import error:', error);
          showError('Failed to import cookies');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  } catch (error) {
    console.error('Import error:', error);
    showError('Failed to import cookies');
  }
} 