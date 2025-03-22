import React from 'react';

const InstallationGuide: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Cookie Manager Installation Guide</h1>
      
      <div className="prose dark:prose-invert max-w-none">
        <h2>Manual Installation Steps</h2>
        
        <h3>For Chrome / Chromium browsers:</h3>
        <ol>
          <li>Download the extension zip file from our website</li>
          <li>Unzip the file to a location on your computer</li>
          <li>Open Chrome and navigate to <code>chrome://extensions</code></li>
          <li>Enable "Developer mode" using the toggle in the top-right corner</li>
          <li>Click "Load unpacked" and select the folder containing the unzipped extension</li>
          <li>The Cookie Manager extension should now appear in your extensions list</li>
        </ol>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg my-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> In Chrome, manually installed extensions may be disabled when you restart the browser. You'll need to re-enable them by clicking the "Enable" button.
          </p>
        </div>
        
        <h3>For Firefox:</h3>
        <ol>
          <li>Download the Firefox version of the extension (.xpi file)</li>
          <li>Open Firefox and navigate to <code>about:addons</code></li>
          <li>Click the gear icon and select "Install Add-on From File..."</li>
          <li>Select the downloaded .xpi file</li>
          <li>Click "Add" when prompted to add the extension</li>
        </ol>
        
        <h3>For Edge:</h3>
        <ol>
          <li>Follow the Chrome installation instructions above, but use <code>edge://extensions</code> instead</li>
          <li>Edge is less restrictive with keeping developer extensions enabled between browser restarts</li>
        </ol>
        
        <h2 className="mt-12">Troubleshooting</h2>
        
        <h3>Extension not working after installation:</h3>
        <ul>
          <li>Make sure you've enabled all required permissions during installation</li>
          <li>Try restarting your browser</li>
          <li>Check if there are any conflicts with other cookie-related extensions</li>
        </ul>
        
        <h3>Extension disappears after browser restart:</h3>
        <ul>
          <li>This is normal for Chrome. Go to <code>chrome://extensions</code>, find Cookie Manager, and click "Enable"</li>
          <li>Consider using Edge or Firefox for a more permanent installation</li>
        </ul>
        
        <h2 className="mt-12">Updates</h2>
        <p>
          Since the extension is installed manually, it won't receive automatic updates. 
          Check our website regularly for new versions and follow the same installation 
          procedure to update.
        </p>
      </div>
    </div>
  );
};

export default InstallationGuide; 