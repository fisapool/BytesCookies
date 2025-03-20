// Error handling and display
function showImportStatus(imported, failed, failedCookies = [], url) {
  const errorDisplay = document.getElementById('errorDisplay');
  const errorList = document.getElementById('errorList');
  
  if (imported > 0) {
    errorDisplay.style.display = 'block';
    let errorHtml = '';
    
    errorHtml += `
      <p>✅ ${imported} cookies imported successfully</p>
      <p class="note">Website: ${url}</p>
    `;
    
    errorList.innerHTML = errorHtml;
  } else {
    errorDisplay.style.display = 'none';
  }
}

// Update cookie import function to use status display
const originalImportCookies = window.cookieUtils.importCookies;
window.cookieUtils.importCookies = async function(data, tab) {
  const result = await originalImportCookies(data, tab);
  showImportStatus(result.imported, result.failed, result.failedCookies, tab.url);
  return result;
}; 