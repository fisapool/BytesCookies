import React from 'react';
import { Navigation } from '../components/Navigation';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4">
            <h2 className="text-2xl font-bold mb-4">Welcome to BytesCookies</h2>
            <p className="text-gray-600">
              This is your protected home page. You can only see this if you're logged in.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}; 