const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// You'll need to install the archiver package:
// npm install archiver --save-dev

const OUTPUT_PATH = path.join(__dirname, '../client/public/downloads/fisabytes.zip');
const EXTENSION_SRC = path.join(__dirname, '../extension'); // Adjust based on your structure

// Create output directory if it doesn't exist
const outputDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a file to stream archive data to
const output = fs.createWriteStream(OUTPUT_PATH);
const archive = archiver('zip', {
  zlib: { level: 9 } // Compression level
});

output.on('close', function() {
  console.log(`Archive created: ${archive.pointer()} total bytes`);
  console.log(`Extension packaged to: ${OUTPUT_PATH}`);
});

archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Append files from the extension directory
archive.directory(EXTENSION_SRC, false);

// Add code to copy landing page assets if needed
function copyLandingPageAssets() {
  console.log('Copying landing page assets...');
  // Copy any necessary assets from your client/public directory
  // to a directory that will be published to GitHub Pages
  
  // Example (modify according to your actual file structure):
  // fs.copyFileSync('client/public/index.html', 'docs/index.html');
  // fs.copyFileSync('client/public/styles.css', 'docs/styles.css');
}

// Call the function as part of your build process if needed
// copyLandingPageAssets();

// Finalize the archive
archive.finalize(); 