// DOM Elements
const loginForm = document.getElementById('loginForm');
const userInfo = document.getElementById('userInfo');
const mainActions = document.getElementById('mainActions');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const errorDisplay = document.getElementById('errorDisplay');
const errorList = document.getElementById('errorList');

// CookieManager instance
let cookieManager;

// Initialize auth state
async function initializeAuth() {
  try {
    cookieManager = new CookieManager();
    await cookieManager.initializeSession();
    
    if (cookieManager.sessionData) {
      showAuthenticatedUI();
    } else {
      showLoginUI();
    }
  } catch (error) {
    showError('Failed to initialize authentication');
    showLoginUI();
  }
}

// Show login UI
function showLoginUI() {
  loginForm.classList.remove('hidden');
  userInfo.classList.add('hidden');
  mainActions.classList.add('hidden');
}

// Show authenticated UI
function showAuthenticatedUI() {
  loginForm.classList.add('hidden');
  userInfo.classList.remove('hidden');
  mainActions.classList.remove('hidden');
  
  // Update user info
  const user = cookieManager.sessionData.user;
  userAvatar.textContent = user.name.charAt(0).toUpperCase();
  userName.textContent = user.name;
  userEmail.textContent = user.email;
}

// Handle login
async function handleLogin(event) {
  event.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }
  
  try {
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading-spinner"></span><span class="button-text">Logging in...</span>';
    
    await cookieManager.login(email, password);
    showAuthenticatedUI();
    clearError();
  } catch (error) {
    showError(error.message || 'Login failed. Please try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span class="button-text">Login</span>';
  }
}

// Handle logout
async function handleLogout() {
  try {
    logoutBtn.disabled = true;
    logoutBtn.innerHTML = '<span class="loading-spinner"></span><span class="button-text">Logging out...</span>';
    
    await cookieManager.logout();
    showLoginUI();
    clearError();
  } catch (error) {
    showError('Logout failed. Please try again.');
  } finally {
    logoutBtn.disabled = false;
    logoutBtn.innerHTML = '<span class="button-text">Logout</span>';
  }
}

// Show error message
function showError(message) {
  errorDisplay.style.display = 'block';
  errorList.innerHTML = `<div class="error-message">${message}</div>`;
}

// Clear error message
function clearError() {
  errorDisplay.style.display = 'none';
  errorList.innerHTML = '';
}

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

// Initialize auth state when popup opens
document.addEventListener('DOMContentLoaded', initializeAuth); 