const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

// Create landing-page directory if it doesn't exist
const landingPageDir = path.join(__dirname, '../landing-page');
if (!fs.existsSync(landingPageDir)) {
  fs.mkdirSync(landingPageDir, { recursive: true });
}

// Copy files from client/public to landing-page
const publicDir = path.join(__dirname, '../client/public');
copyFolderRecursiveSync(publicDir, landingPageDir);

// Copy img directory with logo
const imgSourceDir = path.join(__dirname, '../client/public/img');
const imgTargetDir = path.join(__dirname, '../landing-page/img');

// Create the target directory if it doesn't exist
if (!fs.existsSync(imgTargetDir)) {
  fs.mkdirSync(imgTargetDir, { recursive: true });
}

// Copy the files
if (fs.existsSync(imgSourceDir)) {
  copyFolderRecursiveSync(imgSourceDir, imgTargetDir);
  console.log('Logo copied successfully!');
}

// Copy images directory
const imagesSourceDir = path.join(__dirname, '../client/public/images');
const imagesTargetDir = path.join(__dirname, '../landing-page/images');

// Create the images target directory if it doesn't exist
if (!fs.existsSync(imagesTargetDir)) {
  fs.mkdirSync(imagesTargetDir, { recursive: true });
}

// Copy the image files if the directory exists
if (fs.existsSync(imagesSourceDir)) {
  copyFolderRecursiveSync(imagesSourceDir, imagesTargetDir);
  console.log('Images copied successfully!');
}

// Copy any additional asset directories needed
const assetsSourceDir = path.join(__dirname, '../client/public/assets');
const assetsTargetDir = path.join(__dirname, '../landing-page/assets');

if (fs.existsSync(assetsSourceDir)) {
  if (!fs.existsSync(assetsTargetDir)) {
    fs.mkdirSync(assetsTargetDir, { recursive: true });
  }
  copyFolderRecursiveSync(assetsSourceDir, assetsTargetDir);
  console.log('Assets copied successfully!');
}

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