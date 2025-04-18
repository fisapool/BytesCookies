import { z } from 'zod';

// Diagnostic result types
export interface DiagnosticIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  fix?: () => Promise<void>;
  category: 'typescript' | 'package' | 'general';
}

export interface DiagnosticResult {
  issues: DiagnosticIssue[];
  summary: string;
  timestamp: string;
}

// Configuration validation schemas
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

export class DiagnosticService {
  private static instance: DiagnosticService;
  private constructor() {}

  static getInstance(): DiagnosticService {
    if (!DiagnosticService.instance) {
      DiagnosticService.instance = new DiagnosticService();
    }
    return DiagnosticService.instance;
  }

  async runDiagnostics(): Promise<DiagnosticResult> {
    const issues: DiagnosticIssue[] = [];
    
    // Run TypeScript configuration diagnostics
    const tsConfigIssues = await this.diagnoseTypeScriptConfig();
    issues.push(...tsConfigIssues);

    // Run package.json diagnostics
    const packageIssues = await this.diagnosePackageConfig();
    issues.push(...packageIssues);

    // Run general system diagnostics
    const generalIssues = await this.diagnoseGeneralIssues();
    issues.push(...generalIssues);

    return {
      issues,
      summary: this.generateSummary(issues),
      timestamp: new Date().toISOString(),
    };
  }

  private async diagnoseTypeScriptConfig(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];
    try {
      const response = await fetch('/api/config/tsconfig');
      const config = await response.json();

      // Validate against schema
      try {
        tsConfigSchema.parse(config);
      } catch (error) {
        if (error instanceof z.ZodError) {
          issues.push({
            id: 'ts-schema-validation',
            severity: 'error',
            message: 'TypeScript configuration has invalid schema',
            category: 'typescript',
            fix: async () => {
              // Implement schema fix
              await this.fixTypeScriptSchema(config);
            },
          });
        }
      }

      // Check for common issues
      if (config.compilerOptions.target === 'es5') {
        issues.push({
          id: 'ts-outdated-target',
          severity: 'warning',
          message: 'TypeScript target is set to ES5, consider upgrading to a more modern target',
          category: 'typescript',
          fix: async () => {
            config.compilerOptions.target = 'es2018';
            await this.saveTypeScriptConfig(config);
          },
        });
      }

      // Check for missing essential compiler options
      const essentialOptions = ['strictNullChecks', 'noImplicitAny', 'esModuleInterop'];
      for (const option of essentialOptions) {
        if (!config.compilerOptions[option]) {
          issues.push({
            id: `ts-missing-${option}`,
            severity: 'warning',
            message: `Missing recommended compiler option: ${option}`,
            category: 'typescript',
            fix: async () => {
              config.compilerOptions[option] = true;
              await this.saveTypeScriptConfig(config);
            },
          });
        }
      }

    } catch (error) {
      issues.push({
        id: 'ts-config-load-error',
        severity: 'error',
        message: 'Failed to load TypeScript configuration',
        category: 'typescript',
      });
    }

    return issues;
  }

  private async diagnosePackageConfig(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];
    try {
      const response = await fetch('/api/config/package');
      const config = await response.json();

      // Validate against schema
      try {
        packageConfigSchema.parse(config);
      } catch (error) {
        if (error instanceof z.ZodError) {
          issues.push({
            id: 'package-schema-validation',
            severity: 'error',
            message: 'Package configuration has invalid schema',
            category: 'package',
            fix: async () => {
              await this.fixPackageSchema(config);
            },
          });
        }
      }

      // Check for outdated dependencies
      const outdatedDeps = await this.checkOutdatedDependencies(config);
      if (outdatedDeps.length > 0) {
        issues.push({
          id: 'package-outdated-deps',
          severity: 'warning',
          message: `Found ${outdatedDeps.length} outdated dependencies`,
          category: 'package',
          fix: async () => {
            await this.updateDependencies(outdatedDeps);
          },
        });
      }

      // Check for missing essential scripts
      const essentialScripts = ['build', 'start', 'test'];
      for (const script of essentialScripts) {
        if (!config.scripts[script]) {
          issues.push({
            id: `package-missing-${script}-script`,
            severity: 'warning',
            message: `Missing recommended script: ${script}`,
            category: 'package',
            fix: async () => {
              config.scripts[script] = this.getDefaultScript(script);
              await this.savePackageConfig(config);
            },
          });
        }
      }

    } catch (error) {
      issues.push({
        id: 'package-config-load-error',
        severity: 'error',
        message: 'Failed to load package configuration',
        category: 'package',
      });
    }

    return issues;
  }

  private async diagnoseGeneralIssues(): Promise<DiagnosticIssue[]> {
    const issues: DiagnosticIssue[] = [];

    // Check Node.js version
    try {
      const response = await fetch('/api/system/node-version');
      const { version } = await response.json();
      const majorVersion = parseInt(version.split('.')[0]);
      
      if (majorVersion < 14) {
        issues.push({
          id: 'node-version-outdated',
          severity: 'error',
          message: 'Node.js version is outdated. Please upgrade to Node.js 14 or later.',
          category: 'general',
        });
      }
    } catch (error) {
      issues.push({
        id: 'node-version-check-error',
        severity: 'error',
        message: 'Failed to check Node.js version',
        category: 'general',
      });
    }

    // Check disk space
    try {
      const response = await fetch('/api/system/disk-space');
      const { freeSpace, totalSpace } = await response.json();
      const freeSpaceGB = freeSpace / (1024 * 1024 * 1024);
      
      if (freeSpaceGB < 1) {
        issues.push({
          id: 'low-disk-space',
          severity: 'warning',
          message: 'Low disk space warning: Less than 1GB available',
          category: 'general',
        });
      }
    } catch (error) {
      issues.push({
        id: 'disk-space-check-error',
        severity: 'error',
        message: 'Failed to check disk space',
        category: 'general',
      });
    }

    return issues;
  }

  private generateSummary(issues: DiagnosticIssue[]): string {
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;

    return `Found ${errorCount} errors, ${warningCount} warnings, and ${infoCount} informational issues`;
  }

  private async fixTypeScriptSchema(config: any): Promise<void> {
    // Implement schema fix logic
    await this.saveTypeScriptConfig(config);
  }

  private async fixPackageSchema(config: any): Promise<void> {
    // Implement schema fix logic
    await this.savePackageConfig(config);
  }

  private async checkOutdatedDependencies(config: any): Promise<string[]> {
    // Implement dependency check logic
    return [];
  }

  private async updateDependencies(dependencies: string[]): Promise<void> {
    // Implement dependency update logic
  }

  private getDefaultScript(scriptName: string): string {
    const defaultScripts: Record<string, string> = {
      build: 'tsc',
      start: 'node dist/index.js',
      test: 'jest',
    };
    return defaultScripts[scriptName] || '';
  }

  private async saveTypeScriptConfig(config: any): Promise<void> {
    await fetch('/api/config/tsconfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }

  private async savePackageConfig(config: any): Promise<void> {
    await fetch('/api/config/package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  }
} 