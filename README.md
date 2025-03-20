# FISABytes - Simple Cookie Manager

## Overview
FISABytes is a lightweight Chrome extension that makes cookie management easy. Export and import browser cookies with a clean, simple interface. The extension now includes smart website logo detection and improved error handling for a better user experience.

## Features
- 🔄 **Easy Cookie Management**
  - One-click cookie export
  - Simple cookie import
  - Clean, minimal interface
  - Smart error handling with detailed feedback

- 🎨 **Smart Logo Detection**
  - Automatically detects website logos
  - Multiple fallback methods for logo finding
  - Generates beautiful colored initial logos when no logo is found
  - Smooth loading transitions

- 🔒 **Local Operation**
  - All operations happen in your browser
  - No external servers
  - Minimal permissions required
  - Secure cookie handling

- ⚡ **Improved Error Handling**
  - Clear success/failure messages
  - Website URL display for successful imports
  - Detailed error reporting
  - Automatic skipping of special cookies (__Host-)

## Installation

### Chrome Extension Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `src` directory

## Project Structure
```
FISABytes/
├── src/
│   ├── assets/
│   │   ├── site-logo.js        # Logo detection and handling
│   │   ├── error-handler.js    # Error handling utilities
│   │   └── chunk-44885162.js   # Cookie management utilities
│   ├── img/
│   │   ├── logo-16.png         # Extension icon (16x16)
│   │   ├── logo-32.png         # Extension icon (32x32)
│   │   ├── logo-48.png         # Extension icon (48x48)
│   │   ├── logo-128.png        # Extension icon (128x128)
│   │   ├── logo-placeholder.png # Default logo placeholder
│   │   └── fisa-logo.svg       # FISA brand logo
│   ├── popup.html              # Extension popup interface
│   ├── manifest.json           # Extension configuration
│   └── service-worker-loader.js # Background service worker
├── README.md                   # Project documentation
└── LICENSE                     # MIT License file
```

## Usage
1. Click the FISABytes icon in your browser
2. Choose to Export or Import cookies
3. For importing: select your previously exported .json file
4. For exporting: the file will save to your downloads folder
5. View the website logo and import status in the popup

## Technical Details
- Built with Manifest V3
- Uses Chrome's modern APIs (chrome.scripting)
- Implements smart cookie validation
- Handles various cookie formats and properties

## Limitations and Future Features
- **Cookie Duration Modification**: The current version does not support modifying cookie durations directly through the UI. The extension preserves the original expiration dates during import if they are still valid, otherwise, it creates session cookies.
- **Cookie Editing**: Individual cookie editing features will be implemented in future versions.
- **Advanced Filtering**: Future versions may include filtering options for exports and batch operations.
- **Enhanced Security**: Additional security features for cookie storage and transfer are planned.

## Security Note
- Cookies are exported without encryption
- Use caution when sharing cookie files
- Some websites may have additional security measures
- Special cookies (__Host-) are automatically skipped for security

## Version
Current Version: 2.0

## Support
For support, please visit our [Shopee store](https://shopee.com.my/fisa_trading)

## License
This project is licensed under the MIT License
