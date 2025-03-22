const fs = require('fs');
const path = require('path');

// Create landing-page directory if it doesn't exist
const landingPageDir = path.join(__dirname, '../landing-page');
if (!fs.existsSync(landingPageDir)) {
  fs.mkdirSync(landingPageDir, { recursive: true });
}

// Copy files from client/public to landing-page
const publicDir = path.join(__dirname, '../client/public');
copyFolderRecursiveSync(publicDir, landingPageDir);

console.log('Landing page assets copied successfully!');

// Helper function to copy directory recursively
function copyFolderRecursiveSync(source, target) {
  // Get all files and directories in the source folder
  const files = fs.readdirSync(source);

  // Process each file/directory
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    // If it's a directory, create it in the target and recurse
    if (fs.lstatSync(sourcePath).isDirectory()) {
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }
      copyFolderRecursiveSync(sourcePath, targetPath);
    } 
    // If it's a file, copy it
    else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
} 