// Initialize store and set up state management
const store = {
  state: {
    cookies: [],
    loading: false,
    error: null,
    lastOperation: {
      type: null,
      timestamp: 0,
      success: false
    }
  },
  subscribers: new Set(),

  getState() {
    return { ...this.state };
  },

  setState(partial) {
    this.state = { ...this.state, ...partial };
    this.notifySubscribers();
  },

  subscribe(subscriber) {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  },

  notifySubscribers() {
    this.subscribers.forEach(subscriber => subscriber(this.state));
  }
};

// Initialize UI elements
const loadingOverlay = document.getElementById('loadingOverlay');
const errorDisplay = document.getElementById('errorDisplay');
const errorList = document.getElementById('errorList');
const dismissErrorBtn = document.getElementById('dismissError');
const statusMessage = document.getElementById('statusMessage');

// Subscribe to state changes
store.subscribe(state => {
  // Update loading state
  loadingOverlay.style.display = state.loading ? 'flex' : 'none';

  // Update error display
  if (state.error) {
    errorDisplay.style.display = 'block';
    const errorElement = document.createElement('div');
    errorElement.className = `error-message ${state.error.severity || 'medium'}`;
    errorElement.innerHTML = `
      <h4>${state.error.context || 'Error'}</h4>
      <p>${state.error.message}</p>
    `;
    errorList.appendChild(errorElement);
  }

  // Update status message
  if (state.lastOperation.type) {
    statusMessage.style.display = 'block';
    statusMessage.className = `status-message ${state.lastOperation.success ? 'success' : 'error'}`;
    statusMessage.textContent = state.lastOperation.success
      ? `Successfully ${state.lastOperation.type}ed cookies`
      : `Failed to ${state.lastOperation.type} cookies`;
  }
});

// Set up error dismissal
dismissErrorBtn.addEventListener('click', () => {
  errorDisplay.style.display = 'none';
  errorList.innerHTML = '';
  store.setState({ error: null });
});

// Export store for use in other scripts
window.store = store; 