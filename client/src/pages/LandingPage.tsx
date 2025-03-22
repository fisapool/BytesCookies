import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Cookie Manager
        </h1>
        <p className="text-xl text-center text-gray-600 dark:text-gray-300 max-w-3xl mb-12">
          A powerful tool to export, import, and manage browser cookies with a secure and modern interface.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg">
            <a href="/downloads/cookie-manager.zip" download>Download Extension</a>
          </Button>
          <Button variant="outline" size="lg" className="px-8 py-6 text-lg">
            <Link to="/docs/installation">Installation Guide</Link>
          </Button>
        </div>
        
        <div className="relative w-full max-w-4xl">
          <img 
            src="/images/app-screenshot.png" 
            alt="Cookie Manager Screenshot" 
            className="rounded-lg shadow-2xl w-full"
          />
          <div className="absolute -bottom-4 -right-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg">
            <span className="text-sm font-medium">Works with all major browsers</span>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white dark:bg-gray-800 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16 text-gray-900 dark:text-white">
            Key Features
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "🔄",
                title: "Complete Cookie Management",
                description: "Export, import, and manage browser cookies with ease. Support for various cookie formats."
              },
              {
                icon: "🎨",
                title: "Modern UI/UX",
                description: "Clean, responsive interface with real-time feedback and error notifications."
              },
              {
                icon: "🔒",
                title: "Enhanced Security",
                description: "Local operations ensure your cookie data stays on your machine with secure validation."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Installation Guide */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-16 text-gray-900 dark:text-white">
          Quick Installation Guide
        </h2>
        
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg">
          <ol className="list-decimal pl-5 space-y-6">
            <li className="text-gray-700 dark:text-gray-200">
              <p className="font-medium">Download the extension package</p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Click the download button above to get the latest version</p>
            </li>
            <li className="text-gray-700 dark:text-gray-200">
              <p className="font-medium">Unzip the package</p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Extract the downloaded zip file to a location on your computer</p>
            </li>
            <li className="text-gray-700 dark:text-gray-200">
              <p className="font-medium">Open your browser's extension page</p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                In Chrome: Navigate to chrome://extensions<br />
                In Edge: Navigate to edge://extensions
              </p>
            </li>
            <li className="text-gray-700 dark:text-gray-200">
              <p className="font-medium">Enable Developer Mode</p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Toggle the "Developer mode" switch in the top-right corner</p>
            </li>
            <li className="text-gray-700 dark:text-gray-200">
              <p className="font-medium">Load the extension</p>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Click "Load unpacked" and select the extracted folder</p>
            </li>
          </ol>
          
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              <strong>Note:</strong> Since this extension is not from the Chrome Web Store, you'll need to enable it each time you restart your browser if using Chrome. For permanent installation, consider using Edge or Firefox which have fewer restrictions on external extensions.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h2 className="text-2xl font-bold">Cookie Manager</h2>
              <p className="text-gray-400 mt-2">Secure cookie management for your browser</p>
            </div>
            
            <div className="flex space-x-6">
              <a href="/privacy" className="text-gray-300 hover:text-white">Privacy Policy</a>
              <a href="/terms" className="text-gray-300 hover:text-white">Terms of Use</a>
              <a href="/contact" className="text-gray-300 hover:text-white">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Cookie Manager. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 