"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationWizard = void 0;
const ErrorManager_1 = require("../errors/ErrorManager");
class ConfigurationWizard {
    constructor() {
        this.steps = [
            {
                id: 'api',
                title: 'API Configuration',
                description: 'Configure your API endpoint and credentials',
                validation: async (data) => {
                    try {
                        const response = await fetch(`${data.apiUrl}/health`);
                        return response.ok;
                    }
                    catch (_a) {
                        return false;
                    }
                },
                required: true
            },
            {
                id: 'security',
                title: 'Security Settings',
                description: 'Configure encryption and security preferences',
                validation: async (data) => {
                    return data.encryptionKey && data.encryptionKey.length >= 32;
                },
                required: true
            },
            {
                id: 'domains',
                title: 'Domain Configuration',
                description: 'Configure allowed domains for cookie management',
                validation: async (data) => {
                    return Array.isArray(data.allowedDomains) && data.allowedDomains.length > 0;
                },
                required: true
            },
            {
                id: 'notifications',
                title: 'Notification Settings',
                description: 'Configure notification preferences',
                validation: async () => true,
                required: false
            }
        ];
        this.state = {
            currentStep: 0,
            completedSteps: [],
            configuration: {},
            errors: {}
        };
        this.errorManager = new ErrorManager_1.ErrorManager();
    }
    async initialize() {
        try {
            const savedConfig = await chrome.storage.local.get('configuration');
            if (savedConfig.configuration) {
                this.state.configuration = savedConfig.configuration;
                this.state.completedSteps = Object.keys(savedConfig.configuration);
            }
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'config_init');
            }
        }
    }
    getCurrentStep() {
        return this.steps[this.state.currentStep];
    }
    getProgress() {
        return (this.state.completedSteps.length / this.steps.length) * 100;
    }
    async validateStep(stepId, data) {
        const step = this.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Invalid step ID: ${stepId}`);
        }
        try {
            const isValid = await step.validation(data);
            if (!isValid) {
                this.state.errors[stepId] = 'Validation failed';
                return false;
            }
            delete this.state.errors[stepId];
            return true;
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'step_validation');
                this.state.errors[stepId] = error.message;
            }
            else {
                this.state.errors[stepId] = 'An unknown error occurred';
            }
            return false;
        }
    }
    async saveStep(stepId, data) {
        try {
            this.state.configuration[stepId] = data;
            this.state.completedSteps.push(stepId);
            await chrome.storage.local.set({ configuration: this.state.configuration });
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'step_save');
            }
            throw error;
        }
    }
    async nextStep() {
        if (this.state.currentStep >= this.steps.length - 1) {
            return false;
        }
        const currentStep = this.getCurrentStep();
        if (currentStep.required && !this.state.completedSteps.includes(currentStep.id)) {
            return false;
        }
        this.state.currentStep++;
        return true;
    }
    async previousStep() {
        if (this.state.currentStep <= 0) {
            return false;
        }
        this.state.currentStep--;
        return true;
    }
    getErrors() {
        return this.state.errors;
    }
    isStepCompleted(stepId) {
        return this.state.completedSteps.includes(stepId);
    }
    async reset() {
        this.state = {
            currentStep: 0,
            completedSteps: [],
            configuration: {},
            errors: {}
        };
        await chrome.storage.local.remove('configuration');
    }
    getConfiguration() {
        return this.state.configuration;
    }
    isComplete() {
        return this.steps
            .filter(step => step.required)
            .every(step => this.state.completedSteps.includes(step.id));
    }
}
exports.ConfigurationWizard = ConfigurationWizard;
//# sourceMappingURL=ConfigurationWizard.js.map