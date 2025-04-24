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

## Use Cases

### Development & Testing
- **Local Development**: Easily manage and switch between different cookie states during development
- **Testing Environments**: Quickly switch between test, staging, and production cookie configurations
- **Debugging**: Inspect and modify cookies to debug authentication and session issues

### Security & Privacy
- **Cookie Auditing**: Review and manage cookies for enhanced privacy
- **Session Management**: Control active sessions and prevent unauthorized access
- **Security Testing**: Identify and remove potentially harmful cookies

### User Experience
- **Profile Switching**: Maintain separate cookie profiles for different use cases
- **Cookie Backup**: Export and import cookie configurations for backup
- **Quick Access**: Rapidly access and modify cookie settings through the popup interface

## User Flow

### Basic Usage
1. **Installation**
   - Install the extension from Chrome Web Store
   - Click the FISABytes icon in the browser toolbar
   - Grant necessary permissions for cookie access

2. **Cookie Management**
   - View all cookies for the current domain
   - Export cookies to a JSON file
   - Import previously saved cookies
   - Delete individual or all cookies

3. **Profile Management**
   - Create new cookie profiles
   - Switch between different profiles
   - Export/import profiles for backup

### Advanced Features
1. **Session Control**
   - View active sessions
   - Manage secure cookies (__Host-)
   - Control session persistence

2. **Security Features**
   - Encrypt sensitive cookie data
   - Manage secure and HTTP-only cookies
   - Control cookie permissions

3. **Development Tools**
   - Debug cookie issues
   - Test different authentication states
   - Manage environment-specific cookies

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