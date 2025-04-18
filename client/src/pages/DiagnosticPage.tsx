import React, { useState, useEffect } from 'react';
import { DiagnosticService, DiagnosticResult, DiagnosticIssue } from '../services/DiagnosticService';
import { Button } from '@radix-ui/themes';
import { Navigation } from '../components/Navigation';

export const DiagnosticPage: React.FC = () => {
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const diagnosticService = DiagnosticService.getInstance();

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const result = await diagnosticService.runDiagnostics();
      setDiagnosticResult(result);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const filteredIssues = diagnosticResult?.issues.filter(issue => 
    selectedCategory === 'all' || issue.category === selectedCategory
  ) || [];

  const getSeverityColor = (severity: DiagnosticIssue['severity']) => {
    switch (severity) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSeverityIcon = (severity: DiagnosticIssue['severity']) => {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">System Diagnostics</h1>
            <p className="mt-2 text-sm text-gray-600">
              Run diagnostics to identify and fix configuration issues automatically.
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <Button
                  onClick={() => setSelectedCategory('all')}
                  variant={selectedCategory === 'all' ? 'solid' : 'soft'}
                  color="blue"
                >
                  All Issues
                </Button>
                <Button
                  onClick={() => setSelectedCategory('typescript')}
                  variant={selectedCategory === 'typescript' ? 'solid' : 'soft'}
                  color="blue"
                >
                  TypeScript
                </Button>
                <Button
                  onClick={() => setSelectedCategory('package')}
                  variant={selectedCategory === 'package' ? 'solid' : 'soft'}
                  color="blue"
                >
                  Package
                </Button>
                <Button
                  onClick={() => setSelectedCategory('general')}
                  variant={selectedCategory === 'general' ? 'solid' : 'soft'}
                  color="blue"
                >
                  General
                </Button>
              </div>
              <Button
                onClick={runDiagnostics}
                variant="solid"
                color="blue"
                disabled={isRunning}
              >
                {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
              </Button>
            </div>
          </div>

          {diagnosticResult && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Diagnostic Summary</h2>
                  <p className="mt-1 text-sm text-gray-500">{diagnosticResult.summary}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Last run: {new Date(diagnosticResult.timestamp).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-4">
                  {filteredIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <span className="text-xl">{getSeverityIcon(issue.severity)}</span>
                          <div>
                            <h3 className={`text-sm font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.message}
                            </h3>
                            <p className="mt-1 text-xs text-gray-500">
                              Category: {issue.category}
                            </p>
                          </div>
                        </div>
                        {issue.fix && (
                          <Button
                            onClick={issue.fix}
                            variant="soft"
                            color="blue"
                            size="1"
                          >
                            Fix Issue
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {filteredIssues.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No issues found in this category.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 