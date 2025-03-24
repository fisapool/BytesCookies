// Error handling and display
function showImportStatus(imported, failed, failedCookies = [], url) {
  const errorDisplay = document.getElementById('errorDisplay');
  const errorList = document.getElementById('errorList');

  // Clear previous messages
  errorList.innerHTML = '';

  if (imported > 0) {
    errorDisplay.style.display = 'block';
    let successHtml = `
      <p>✅ ${imported} cookies imported successfully</p>
      <p class="note">Website: ${url}</p>
    `;
    errorList.innerHTML += successHtml;
  } else {
    errorDisplay.style.display = 'none';
  }

  if (failed > 0) {
    errorDisplay.style.display = 'block'; // Show error display if there are failed cookies
    let failedHtml = `<p>❌ ${failed} cookies failed to import:</p><ul>`;
    
    failedCookies.forEach(cookie => {
      failedHtml += `<li>${cookie.name} - Reason: ${cookie.reason}</li>`;
    });
    
    failedHtml += '</ul>';
    errorList.innerHTML += failedHtml;
  }
}

// Update cookie import function to use status display
const originalImportCookies = window.cookieUtils.importCookies;
window.cookieUtils.importCookies = async function(data, tab) {
  const result = await originalImportCookies(data, tab);
  showImportStatus(result.imported, result.failed, result.failedCookies, tab.url);
  return result;
};
