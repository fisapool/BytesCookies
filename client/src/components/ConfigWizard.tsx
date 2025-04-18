import React, { useState, useCallback } from 'react';
import { Button, Theme } from '@radix-ui/themes';
import { z } from 'zod';

// Configuration schemas
const tsConfigSchema = z.object({
  compilerOptions: z.object({
    target: z.string(),
    module: z.string(),
    lib: z.array(z.string()),
    skipLibCheck: z.boolean(),
    sourceMap: z.boolean(),
    outDir: z.string(),
    moduleResolution: z.string(),
    removeComments: z.boolean(),
    noImplicitAny: z.boolean(),
    strictNullChecks: z.boolean(),
    strictFunctionTypes: z.boolean(),
    noImplicitThis: z.boolean(),
    noUnusedLocals: z.boolean(),
    noUnusedParameters: z.boolean(),
    noImplicitReturns: z.boolean(),
    noFallthroughCasesInSwitch: z.boolean(),
    allowSyntheticDefaultImports: z.boolean(),
    esModuleInterop: z.boolean(),
    emitDecoratorMetadata: z.boolean(),
    experimentalDecorators: z.boolean(),
    resolveJsonModule: z.boolean(),
    baseUrl: z.string(),
  }),
  exclude: z.array(z.string()),
  include: z.array(z.string()),
});

const packageConfigSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  main: z.string(),
  scripts: z.record(z.string()),
  dependencies: z.record(z.string()),
  devDependencies: z.record(z.string()).optional(),
});

type ConfigType = 'typescript' | 'package';

interface ConfigWizardProps {
  type: ConfigType;
  initialConfig: any;
  onSave: (config: any) => void;
}

interface WizardStep {
  title: string;
  description: string;
  fields: string[];
  validation?: (config: any) => string[];
}

const getWizardSteps = (type: ConfigType): WizardStep[] => {
  if (type === 'typescript') {
    return [
      {
        title: 'Basic Configuration',
        description: 'Set up the basic TypeScript compiler options',
        fields: ['compilerOptions.target', 'compilerOptions.module', 'compilerOptions.outDir'],
        validation: (config) => {
          const errors: string[] = [];
          if (!config.compilerOptions.target) errors.push('Target is required');
          if (!config.compilerOptions.module) errors.push('Module is required');
          if (!config.compilerOptions.outDir) errors.push('Output directory is required');
          return errors;
        }
      },
      {
        title: 'Type Checking',
        description: 'Configure TypeScript type checking options',
        fields: [
          'compilerOptions.noImplicitAny',
          'compilerOptions.strictNullChecks',
          'compilerOptions.strictFunctionTypes',
          'compilerOptions.noImplicitThis'
        ]
      },
      {
        title: 'Module Resolution',
        description: 'Set up module resolution and import settings',
        fields: [
          'compilerOptions.moduleResolution',
          'compilerOptions.baseUrl',
          'compilerOptions.esModuleInterop',
          'compilerOptions.resolveJsonModule'
        ]
      },
      {
        title: 'Source Files',
        description: 'Configure which files to include and exclude',
        fields: ['include', 'exclude']
      }
    ];
  } else {
    return [
      {
        title: 'Project Information',
        description: 'Set up basic project information',
        fields: ['name', 'version', 'description', 'main'],
        validation: (config) => {
          const errors: string[] = [];
          if (!config.name) errors.push('Project name is required');
          if (!config.version) errors.push('Version is required');
          if (!config.description) errors.push('Description is required');
          return errors;
        }
      },
      {
        title: 'Scripts',
        description: 'Configure project scripts',
        fields: ['scripts']
      },
      {
        title: 'Dependencies',
        description: 'Set up project dependencies',
        fields: ['dependencies', 'devDependencies']
      }
    ];
  }
};

export const ConfigWizard: React.FC<ConfigWizardProps> = ({
  type,
  initialConfig,
  onSave,
}) => {
  const [config, setConfig] = useState(initialConfig);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const steps = getWizardSteps(type);
  const currentStepData = steps[currentStep];

  const validateCurrentStep = useCallback(() => {
    if (currentStepData.validation) {
      const stepErrors = currentStepData.validation(config);
      setErrors(stepErrors);
      return stepErrors.length === 0;
    }
    return true;
  }, [currentStepData, config]);

  const validateConfig = useCallback(() => {
    try {
      const schema = type === 'typescript' ? tsConfigSchema : packageConfigSchema;
      schema.parse(config);
      setErrors([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(error.errors.map(err => err.message));
      } else {
        setErrors(['An unexpected error occurred']);
      }
      return false;
    }
  }, [config, type]);

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
        setErrors([]);
      } else {
        handleSave();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors([]);
    }
  };

  const handleSave = async () => {
    if (validateConfig()) {
      setIsSaving(true);
      try {
        await onSave(config);
      } catch (error) {
        setErrors(['Failed to save configuration']);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const getFieldValue = (path: string) => {
    return path.split('.').reduce((obj, key) => obj?.[key], config);
  };

  const setFieldValue = (path: string, value: any) => {
    const newConfig = { ...config };
    const keys = path.split('.');
    let current = newConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
  };

  const renderField = (field: string) => {
    const value = getFieldValue(field);
    const label = field.split('.').pop() || '';

    if (typeof value === 'boolean') {
      return (
        <div key={field} className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => setFieldValue(field, e.target.checked)}
              className="form-checkbox h-4 w-4"
            />
            <span className="text-sm font-medium">{label}</span>
          </label>
        </div>
      );
    }

    if (typeof value === 'string') {
      return (
        <div key={field} className="mb-4">
          <label className="block text-sm font-medium mb-1">{label}</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setFieldValue(field, e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={field} className="mb-4">
          <label className="block text-sm font-medium mb-1">{label}</label>
          <div className="space-y-2">
            {value.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newValue = [...value];
                    newValue[index] = e.target.value;
                    setFieldValue(field, newValue);
                  }}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button
                  onClick={() => {
                    const newValue = value.filter((_: any, i: number) => i !== index);
                    setFieldValue(field, newValue);
                  }}
                  variant="soft"
                  color="red"
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              onClick={() => setFieldValue(field, [...value, ''])}
              variant="soft"
            >
              Add Item
            </Button>
          </div>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={field} className="mb-4">
          <h3 className="text-lg font-medium mb-2">{label}</h3>
          <div className="pl-4 border-l-2">
            {Object.entries(value).map(([k, v]) => (
              <div key={k}>
                {renderField(`${field}.${k}`)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Theme>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {type === 'typescript' ? 'TypeScript' : 'Package'} Configuration Wizard
            </h2>
            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-2">{currentStepData.title}</h3>
            <p className="text-gray-600">{currentStepData.description}</p>
          </div>

          <div className="space-y-6">
            {currentStepData.fields.map(field => renderField(field))}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <h3 className="text-red-800 font-medium mb-2">Validation Errors:</h3>
            <ul className="list-disc list-inside text-red-600">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <div className="space-x-4">
            <Button
              onClick={() => setConfig(initialConfig)}
              variant="soft"
              color="gray"
              disabled={isSaving}
            >
              Reset
            </Button>
            {currentStep > 0 && (
              <Button
                onClick={handleBack}
                variant="soft"
                color="gray"
                disabled={isSaving}
              >
                Back
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            variant="solid"
            color="blue"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : currentStep === steps.length - 1 ? (
              'Save Configuration'
            ) : (
              'Next'
            )}
          </Button>
        </div>
      </div>
    </Theme>
  );
}; 