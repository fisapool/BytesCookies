import React, { useState } from 'react';
import { ConfigWizard } from '../components/ConfigWizard';
import { Button } from '@radix-ui/themes';
import { Navigation } from '../components/Navigation';

interface ConfigData {
  typescript: any;
  package: any;
}

export const ConfigPage: React.FC = () => {
  const [activeConfig, setActiveConfig] = useState<'typescript' | 'package'>('typescript');
  const [configs, setConfigs] = useState<ConfigData>({
    typescript: {
      compilerOptions: {
        target: "es2018",
        module: "commonjs",
        lib: ["es2018", "esnext.asynciterable"],
        skipLibCheck: true,
        sourceMap: true,
        outDir: "./dist",
        moduleResolution: "node",
        removeComments: true,
        noImplicitAny: true,
        strictNullChecks: true,
        strictFunctionTypes: true,
        noImplicitThis: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noImplicitReturns: true,
        noFallthroughCasesInSwitch: true,
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        resolveJsonModule: true,
        baseUrl: "."
      },
      exclude: ["node_modules"],
      include: ["./server/**/*.ts"]
    },
    package: {
      name: "bytescookies",
      version: "1.0.0",
      description: "Cookie management web application",
      main: "server/index.js",
      scripts: {
        dev: "npm run dev:server & npm run dev:client",
        "dev:client": "cd client && npm run dev",
        "dev:server": "ts-node-dev --respawn --transpile-only server/index.ts",
        build: "npm run build:client && npm run build:server",
        "build:client": "cd client && npm run build",
        "build:server": "tsc",
        start: "node dist/server/index.js"
      },
      dependencies: {
        "@prisma/client": "^5.10.0",
        "@radix-ui/react-slot": "^1.0.2",
        "@radix-ui/themes": "^2.0.3",
        "express": "^4.18.2"
      },
      devDependencies: {
        "prisma": "^5.10.0",
        "typescript": "^5.8.3"
      }
    }
  });

  const handleSave = (newConfig: any) => {
    setConfigs(prev => ({
      ...prev,
      [activeConfig]: newConfig
    }));
    // Here you would typically make an API call to save the configuration
    console.log(`Saving ${activeConfig} configuration:`, newConfig);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Configuration Management</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your TypeScript and package configurations through a user-friendly interface.
            </p>
          </div>

          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveConfig('typescript')}
                  className={`${
                    activeConfig === 'typescript'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  TypeScript Config
                </button>
                <button
                  onClick={() => setActiveConfig('package')}
                  className={`${
                    activeConfig === 'package'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Package Config
                </button>
              </nav>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <ConfigWizard
              type={activeConfig}
              initialConfig={configs[activeConfig]}
              onSave={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 