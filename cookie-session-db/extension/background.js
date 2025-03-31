// Store for tracking when cookies were last synced
let lastSyncTime = Date.now()
const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

// Function to get all cookies
async function getAllCookies() {
  return new Promise((resolve) => {
    chrome.cookies.getAll({}, (cookies) => {
      resolve(cookies)
    })
  })
}

// Function to sync cookies with the server
async function syncCookiesWithServer() {
  try {
    const cookies = await getAllCookies()
    const cookiesByDomain = {}

    // Organize cookies by domain
    cookies.forEach((cookie) => {
      const domain = cookie.domain
      if (!cookiesByDomain[domain]) {
        cookiesByDomain[domain] = []
      }
      cookiesByDomain[domain].push(cookie)
    })

    // Send cookies to server
    const response = await fetch("https://your-api-url.com/api/cookies/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cookiesByDomain),
      credentials: "include", // Important for sending cookies with the request
    })

    const result = await response.json()
    if (result.success) {
      console.log("Cookies synced successfully")
      lastSyncTime = Date.now()
    } else {
      console.error("Failed to sync cookies:", result.error)
    }
  } catch (error) {
    console.error("Error syncing cookies:", error)
  }
}

// Function to load cookies from server
async function loadCookiesFromServer() {
  try {
    const response = await fetch("https://your-api-url.com/api/cookies/sync", {
      method: "GET",
      credentials: "include", // Important for sending cookies with the request
    })

    const result = await response.json()
    if (result.cookies) {
      // Process and set cookies from the server
      const domains = Object.keys(result.cookies)
      for (const domain of domains) {
        const domainCookies = result.cookies[domain]
        for (const cookie of domainCookies) {
          chrome.cookies.set({
            url: `http${cookie.secure ? "s" : ""}://${cookie.domain}${cookie.path}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate,
          })
        }
      }
      console.log("Cookies loaded from server")
    }
  } catch (error) {
    console.error("Error loading cookies from server:", error)
  }
}

// Listen for cookie changes
chrome.cookies.onChanged.addListener((changeInfo) => {
  // Only sync if it's been more than SYNC_INTERVAL since the last sync
  if (Date.now() - lastSyncTime > SYNC_INTERVAL) {
    syncCookiesWithServer()
  }
})

// Sync cookies periodically
setInterval(syncCookiesWithServer, SYNC_INTERVAL)

// Sync cookies on startup
chrome.runtime.onStartup.addListener(() => {
  loadCookiesFromServer()
})

// Sync cookies when extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  syncCookiesWithServer()
})

// Add a context menu option to manually sync cookies
chrome.contextMenus.create({
  id: "syncCookies",
  title: "Sync Cookies Now",
  contexts: ["browser_action"],
})

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "syncCookies") {
    syncCookiesWithServer()
  }
})

