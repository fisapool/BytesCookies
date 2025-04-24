document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const domainInput = document.getElementById('domain');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const statusMessage = document.getElementById('statusMessage');
  const errorDisplay = document.getElementById('errorDisplay');
  const errorList = document.getElementById('errorList');
  const dismissError = document.getElementById('dismissError');
  const exportBtnText = exportBtn.querySelector('.button-text');
  const importBtnText = importBtn.querySelector('.button-text');

  // Helper function to show status message
  function showStatus(message, isError = false) {
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.style.display = 'block';
      statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
      
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 5000);
    }
  }

  // Helper function to show error message
  function showError(message, severity = 'medium') {
    if (errorList && errorDisplay) {
      const errorItem = document.createElement('div');
      errorItem.className = `error-item ${severity}`;
      errorItem.textContent = message;
      errorList.appendChild(errorItem);
      errorDisplay.style.display = 'block';
    }
  }

  // Helper function to clear errors
  function clearErrors() {
    if (errorList && errorDisplay) {
      errorList.innerHTML = '';
      errorDisplay.style.display = 'none';
    }
  }

  // Helper function to update button state
  function updateButtonState(button, buttonText, disabled, message = null) {
    if (button) {
      button.disabled = disabled;
      button.style.opacity = disabled ? '0.5' : '1';
    }
    
    if (buttonText && message) {
      buttonText.textContent = message;
    }
  }

  // Export cookies
  exportBtn.addEventListener('click', async () => {
    try {
      const domain = domainInput.value.trim();
      if (!domain) {
        showError('Please enter a domain', 'low');
        return;
      }

      updateButtonState(exportBtn, exportBtnText, true, 'Exporting...');
      clearErrors();

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const data = await window.cookieUtils.exportCookies(tab);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `cookies-${domain}-${timestamp}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
      showStatus('Cookies exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showError(`Export failed: ${error.message}`, 'critical');
    } finally {
      updateButtonState(exportBtn, exportBtnText, false, 'Export Cookies');
    }
  });

  // Import cookies
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

        updateButtonState(importBtn, importBtnText, true, 'Importing...');
        clearErrors();

        const text = await file.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch (error) {
          throw new Error('Invalid JSON format');
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url) {
          throw new Error('No active tab found');
        }

        const result = await window.cookieUtils.importCookies(data, tab);
        
        if (result.imported > 0) {
          showStatus(`Successfully imported ${result.imported} cookies`);
          if (result.failed > 0) {
            showError(`${result.failed} cookies failed to import`, 'medium');
          }
          
          // Reload the current tab
          await chrome.tabs.reload(tab.id);
        } else {
          throw new Error('No cookies were imported. Make sure you\'re on the correct domain.');
        }
      } catch (error) {
        console.error('Import error:', error);
        showError(`Import failed: ${error.message}`, 'critical');
      } finally {
        updateButtonState(importBtn, importBtnText, false, 'Import Cookies');
      }
    };
    
    input.click();
  });

  // Dismiss error button
  if (dismissError) {
    dismissError.addEventListener('click', clearErrors);
  }
}); 