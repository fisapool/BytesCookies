// DOM Elements
const loginForm = document.getElementById('loginForm');
const mainInterface = document.getElementById('mainInterface');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginError = document.getElementById('loginError');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');
const refreshCookiesBtn = document.getElementById('refreshCookiesBtn');
const clearCookiesBtn = document.getElementById('clearCookiesBtn');
const cookieList = document.getElementById('cookieList');
const autoRefreshCheckbox = document.getElementById('autoRefresh');
const refreshIntervalInput = document.getElementById('refreshInterval');
const logoutBtn = document.getElementById('logoutBtn');

// State
let currentUser = null;
let autoRefreshInterval = null;
let cookieFilters = {
  domain: '',
  name: '',
  secure: null,
  httpOnly: null
};

let selectedCookies = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Check for existing session
        const session = await chrome.storage.local.get(['user', 'settings']);
        if (session.user) {
            currentUser = session.user;
            updateUI(true);
            loadSettings(session.settings);
            loadCookies();
        } else {
            updateUI(false);
        }
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize the extension');
    }
});

// Event Listeners
loginBtn.addEventListener('click', handleLogin);
registerBtn.addEventListener('click', handleRegister);
logoutBtn.addEventListener('click', handleLogout);
refreshCookiesBtn.addEventListener('click', refreshCookies);
clearCookiesBtn.addEventListener('click', clearCookies);
autoRefreshCheckbox.addEventListener('change', handleAutoRefreshChange);
refreshIntervalInput.addEventListener('change', handleRefreshIntervalChange);

// Add new UI elements
const searchInput = document.createElement('input');
searchInput.type = 'text';
searchInput.id = 'cookieSearch';
searchInput.placeholder = 'Search cookies...';
searchInput.className = 'search-input';

const filterContainer = document.createElement('div');
filterContainer.className = 'filter-container';
filterContainer.innerHTML = `
  <div class="filter-group">
    <label>Domain:</label>
    <input type="text" id="domainFilter" placeholder="Filter by domain">
  </div>
  <div class="filter-group">
    <label>Secure:</label>
    <select id="secureFilter">
      <option value="">All</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  </div>
  <div class="filter-group">
    <label>HttpOnly:</label>
    <select id="httpOnlyFilter">
      <option value="">All</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  </div>
`;

const bulkActionsContainer = document.createElement('div');
bulkActionsContainer.className = 'bulk-actions';
bulkActionsContainer.innerHTML = `
  <button id="selectAllBtn" class="btn btn-secondary">Select All</button>
  <button id="deleteSelectedBtn" class="btn btn-danger" disabled>Delete Selected</button>
`;

// Insert new elements into the DOM
document.querySelector('.cookie-management').insertBefore(searchInput, cookieList);
document.querySelector('.cookie-management').insertBefore(filterContainer, cookieList);
document.querySelector('.cookie-management').insertBefore(bulkActionsContainer, cookieList);

// Add event listeners for new functionality
searchInput.addEventListener('input', debounce(handleSearch, 300));
document.getElementById('domainFilter').addEventListener('input', debounce(handleFilterChange, 300));
document.getElementById('secureFilter').addEventListener('change', handleFilterChange);
document.getElementById('httpOnlyFilter').addEventListener('change', handleFilterChange);
document.getElementById('selectAllBtn').addEventListener('click', handleSelectAll);
document.getElementById('deleteSelectedBtn').addEventListener('click', handleDeleteSelected);

// Authentication Handlers
async function handleLogin() {
    try {
        setLoading(true);
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showLoginError('Please enter both email and password');
            return;
        }

        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        currentUser = data.user;
        await chrome.storage.local.set({ user: currentUser });
        updateUI(true);
        loadCookies();
    } catch (error) {
        console.error('Login error:', error);
        showLoginError(error.message);
    } finally {
        setLoading(false);
    }
}

async function handleRegister() {
    try {
        setLoading(true);
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showLoginError('Please enter both email and password');
            return;
        }

        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        const data = await response.json();
        currentUser = data.user;
        await chrome.storage.local.set({ user: currentUser });
        updateUI(true);
        loadCookies();
    } catch (error) {
        console.error('Registration error:', error);
        showLoginError(error.message);
    } finally {
        setLoading(false);
    }
}

async function handleLogout() {
    try {
        setLoading(true);
        await chrome.storage.local.remove(['user', 'settings']);
        currentUser = null;
        clearAutoRefreshInterval();
        updateUI(false);
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout');
    } finally {
        setLoading(false);
    }
}

// Cookie Management
async function loadCookies() {
    try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/api/cookies', {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to load cookies');
        }

        const cookies = await response.json();
        displayCookies(cookies);
    } catch (error) {
        console.error('Load cookies error:', error);
        showError('Failed to load cookies');
    } finally {
        setLoading(false);
    }
}

async function refreshCookies() {
    try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/api/cookies/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to refresh cookies');
        }

        const cookies = await response.json();
        displayCookies(cookies);
    } catch (error) {
        console.error('Refresh cookies error:', error);
        showError('Failed to refresh cookies');
    } finally {
        setLoading(false);
    }
}

async function clearCookies() {
    try {
        setLoading(true);
        const response = await fetch('http://localhost:3000/api/cookies/clear', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to clear cookies');
        }

        cookieList.innerHTML = '';
    } catch (error) {
        console.error('Clear cookies error:', error);
        showError('Failed to clear cookies');
    } finally {
        setLoading(false);
    }
}

// Settings Management
function loadSettings(settings = {}) {
    autoRefreshCheckbox.checked = settings.autoRefresh || false;
    refreshIntervalInput.value = settings.refreshInterval || 5;
    
    if (settings.autoRefresh) {
        startAutoRefresh(settings.refreshInterval);
    }
}

async function handleAutoRefreshChange() {
    const settings = {
        autoRefresh: autoRefreshCheckbox.checked,
        refreshInterval: parseInt(refreshIntervalInput.value) || 5,
    };

    await chrome.storage.local.set({ settings });

    if (settings.autoRefresh) {
        startAutoRefresh(settings.refreshInterval);
    } else {
        clearAutoRefreshInterval();
    }
}

async function handleRefreshIntervalChange() {
    const interval = parseInt(refreshIntervalInput.value) || 5;
    const settings = {
        autoRefresh: autoRefreshCheckbox.checked,
        refreshInterval: interval,
    };

    await chrome.storage.local.set({ settings });

    if (settings.autoRefresh) {
        startAutoRefresh(interval);
    }
}

// Auto Refresh
function startAutoRefresh(interval) {
    clearAutoRefreshInterval();
    autoRefreshInterval = setInterval(refreshCookies, interval * 60 * 1000);
}

function clearAutoRefreshInterval() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// UI Helpers
function updateUI(isAuthenticated) {
    loginForm.style.display = isAuthenticated ? 'none' : 'block';
    mainInterface.style.display = isAuthenticated ? 'block' : 'none';
    
    if (isAuthenticated && currentUser) {
        userEmail.textContent = currentUser.email;
        userAvatar.src = currentUser.avatar || 'icons/avatar.png';
    }
}

function displayCookies(cookies) {
    cookieList.innerHTML = '';
    cookies.forEach(cookie => {
        const cookieElement = document.createElement('div');
        cookieElement.className = 'cookie-item';
        cookieElement.dataset.cookieId = cookie.id;
        
        const matchesFilters = 
          (!cookieFilters.domain || cookie.domain.toLowerCase().includes(cookieFilters.domain)) &&
          (!cookieFilters.name || cookie.name.toLowerCase().includes(cookieFilters.name)) &&
          (cookieFilters.secure === '' || cookie.secure.toString() === cookieFilters.secure) &&
          (cookieFilters.httpOnly === '' || cookie.httpOnly.toString() === cookieFilters.httpOnly);
        
        cookieElement.style.display = matchesFilters ? '' : 'none';
        
        cookieElement.innerHTML = `
          <div class="cookie-header">
            <input type="checkbox" class="cookie-checkbox" ${selectedCookies.has(cookie.id) ? 'checked' : ''}>
            <div class="cookie-name">${cookie.name}</div>
            <div class="cookie-domain">${cookie.domain}</div>
          </div>
          <div class="cookie-details">
            <div class="cookie-value">${cookie.value}</div>
            <div class="cookie-meta">
              <span class="cookie-secure">${cookie.secure ? '🔒' : ''}</span>
              <span class="cookie-httponly">${cookie.httpOnly ? '🔐' : ''}</span>
              <span class="cookie-expiry">${formatExpiry(cookie.expirationDate)}</span>
            </div>
          </div>
        `;
        
        const checkbox = cookieElement.querySelector('.cookie-checkbox');
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            selectedCookies.add(cookie.id);
          } else {
            selectedCookies.delete(cookie.id);
          }
          updateDeleteButtonState();
        });
        
        cookieList.appendChild(cookieElement);
    });
    
    updateDeleteButtonState();
}

function showLoginError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
}

function showError(message) {
    // You can implement a more sophisticated error display mechanism here
    console.error(message);
}

function setLoading(isLoading) {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.disabled = isLoading;
    });
    
    if (isLoading) {
        document.body.classList.add('loading');
    } else {
        document.body.classList.remove('loading');
    }
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Handle search input
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase();
  const cookieItems = cookieList.getElementsByClassName('cookie-item');
  
  Array.from(cookieItems).forEach(item => {
    const cookieName = item.querySelector('.cookie-name').textContent.toLowerCase();
    const cookieValue = item.querySelector('.cookie-value').textContent.toLowerCase();
    const matches = cookieName.includes(searchTerm) || cookieValue.includes(searchTerm);
    item.style.display = matches ? '' : 'none';
  });
}

// Handle filter changes
function handleFilterChange() {
  cookieFilters = {
    domain: document.getElementById('domainFilter').value.toLowerCase(),
    name: document.getElementById('cookieSearch').value.toLowerCase(),
    secure: document.getElementById('secureFilter').value,
    httpOnly: document.getElementById('httpOnlyFilter').value
  };
  
  refreshCookieList();
}

// Handle select all
function handleSelectAll() {
  const cookieItems = cookieList.getElementsByClassName('cookie-item');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const isSelectAll = selectAllBtn.textContent === 'Select All';
  
  Array.from(cookieItems).forEach(item => {
    if (item.style.display !== 'none') {
      const checkbox = item.querySelector('.cookie-checkbox');
      checkbox.checked = isSelectAll;
      const cookieId = item.dataset.cookieId;
      if (isSelectAll) {
        selectedCookies.add(cookieId);
      } else {
        selectedCookies.delete(cookieId);
      }
    }
  });
  
  selectAllBtn.textContent = isSelectAll ? 'Deselect All' : 'Select All';
  updateDeleteButtonState();
}

// Handle delete selected
async function handleDeleteSelected() {
  if (!selectedCookies.size) return;
  
  try {
    setLoading(true);
    const cookieManager = new CookieManager();
    const results = await Promise.all(
      Array.from(selectedCookies).map(async cookieId => {
        try {
          await cookieManager.deleteCookie(cookieId);
          return { success: true, cookieId };
        } catch (error) {
          return { success: false, cookieId, error };
        }
      })
    );
    
    const successCount = results.filter(r => r.success).length;
    showNotification(`Successfully deleted ${successCount} cookies`);
    
    selectedCookies.clear();
    refreshCookieList();
  } catch (error) {
    showError('Failed to delete selected cookies');
  } finally {
    setLoading(false);
  }
}

// Update delete button state
function updateDeleteButtonState() {
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  deleteSelectedBtn.disabled = selectedCookies.size === 0;
}

// Format expiry date
function formatExpiry(expirationDate) {
  if (!expirationDate) return 'Session';
  const date = new Date(expirationDate * 1000);
  return date.toLocaleString();
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
} 