# FISABytes - Chrome Extension

A powerful Chrome extension for managing browser cookies and sessions with enhanced security features.

## Current Limitations

### Technical Limitations
- ⚠️ **Cookie Duration**: Currently does not support modifying cookie durations through the UI. Original expiration dates are preserved during import if valid, otherwise session cookies are created.
- ⚠️ **Cookie Editing**: Individual cookie editing features are not yet implemented.
- ⚠️ **Advanced Filtering**: Limited filtering options for exports and batch operations.
- ⚠️ **Cross-Browser Support**: Currently only supports Chrome browser.

### Security Limitations
- ⚠️ **Cookie Encryption**: Basic encryption is implemented, but advanced encryption features are pending.
- ⚠️ **Host-Only Cookies**: Special cookies (__Host-) are automatically skipped for security reasons.
- ⚠️ **Third-Party Cookies**: Limited support for managing third-party cookies in certain scenarios.

### Feature Limitations
- ⚠️ **Session Sync**: Cross-device session synchronization is currently in development.
- ⚠️ **Backup**: Automated backup features are not yet available.
- ⚠️ **API Integration**: Limited API endpoints for external integration.

## Project Structure
```
FISABytes/
├── _locales/           # Localization files
├── assets/            # Static assets and scripts
├── errors/            # Error handling
├── img/              # Images and icons
├── security/         # Security features
├── src/              # Source code
├── types/            # TypeScript types
├── validation/       # Validation logic
├── manifest.json     # Extension manifest
├── popup.html        # Popup interface
└── service-worker-loader.js  # Service worker
```

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Load the extension in Chrome

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests

## License

MIT 