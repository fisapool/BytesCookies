document.addEventListener('DOMContentLoaded', () => {
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');

  // Helper function to validate and format cookie data
  function validateAndFormatCookies(data) {
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid JSON string');
      }
    }

    if (data && typeof data === 'object' && !Array.isArray(data)) {
      data = [data];
    }

    if (!Array.isArray(data)) {
      throw new Error('Cookie data must be an array or single object');
    }

    return data.filter(cookie => {
      if (!cookie || typeof cookie !== 'object') return false;
      if (!cookie.name || !cookie.domain) {
        console.warn('Skipping invalid cookie:', cookie);
        return false;
      }
      cookie.path = cookie.path || '/'; // Default path if not provided
      return true;
    });
  }

  function updateButtonStatus(button, status, message) {
    const buttonText = button.querySelector('.button-text');
    button.className = `action-button ${status}`;
    buttonText.textContent = message;
    buttonText.classList.add('status-message');

    setTimeout(() => {
      resetButton(button);
    }, status === 'error' ? 3000 : 2000);
  }

  function resetButton(button) {
    const buttonText = button.querySelector('.button-text');
    button.className = 'action-button';
    buttonText.textContent = button === exportBtn ? 'Export Cookies' : 'Import Cookies';
    buttonText.classList.remove('status-message');
  }

  exportBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const data = await window.cookieUtils.exportCookies(tab);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `cookies-${timestamp}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      updateButtonStatus(exportBtn, 'success', 'Cookies Exported!');
    } catch (error) {
      console.error('Export error:', error);
      updateButtonStatus(exportBtn, 'error', 'Export Failed: ' + error.message);
    }
  });

  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) {
          throw new Error('No file selected');
        }

        const text = await file.text();
        const data = validateAndFormatCookies(text); // Validate and format the cookies

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) {
          throw new Error('No active tab found');
        }

        const result = await window.cookieUtils.importCookies(data, tab);
        
        if (result.imported > 0) {
          updateButtonStatus(importBtn, 'success', `Imported ${result.imported} cookies`);
          if (result.failed > 0) {
            console.warn(`${result.failed} cookies failed to import`);
          }
          
          // Show reloading message
          setTimeout(() => {
            updateButtonStatus(importBtn, '', 'Reloading page...');
          }, 500);

          // Reload the current tab
          await chrome.tabs.reload(tab.id);
        } else {
          throw new Error('No cookies were imported. Make sure you\'re on the correct domain.');
        }
      } catch (error) {
        console.error('Import error:', error);
        updateButtonStatus(importBtn, 'error', `Import Failed: ${error.message}`);
      }
    };
    
    input.click();
  });
});
