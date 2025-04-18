"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupportSystem = void 0;
const ErrorManager_1 = require("./ErrorManager");
class SupportSystem {
    constructor() {
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000;
        this.errorManager = new ErrorManager_1.ErrorManager();
        this.API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3000/support'
            : 'https://api.bytescookies.com/support';
    }
    async createTicket(ticket) {
        try {
            const response = await this.fetchWithRetry(`${this.API_BASE_URL}/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...ticket,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    status: 'open'
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to create ticket: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                ticket: data
            };
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'create_ticket');
                return {
                    success: false,
                    error: error.message
                };
            }
            return {
                success: false,
                error: 'An unknown error occurred'
            };
        }
    }
    async updateTicket(ticketId, updates) {
        try {
            const response = await this.fetchWithRetry(`${this.API_BASE_URL}/tickets/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...updates,
                    updatedAt: Date.now()
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to update ticket: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                ticket: data
            };
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'update_ticket');
                return {
                    success: false,
                    error: error.message
                };
            }
            return {
                success: false,
                error: 'An unknown error occurred'
            };
        }
    }
    async addComment(ticketId, comment) {
        try {
            const response = await this.fetchWithRetry(`${this.API_BASE_URL}/tickets/${ticketId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...comment,
                    createdAt: Date.now()
                })
            });
            if (!response.ok) {
                throw new Error(`Failed to add comment: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                ticket: data
            };
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'add_comment');
                return {
                    success: false,
                    error: error.message
                };
            }
            return {
                success: false,
                error: 'An unknown error occurred'
            };
        }
    }
    async getTicket(ticketId) {
        try {
            const response = await this.fetchWithRetry(`${this.API_BASE_URL}/tickets/${ticketId}`);
            if (!response.ok) {
                throw new Error(`Failed to get ticket: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                ticket: data
            };
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'get_ticket');
                return {
                    success: false,
                    error: error.message
                };
            }
            return {
                success: false,
                error: 'An unknown error occurred'
            };
        }
    }
    async getUserTickets(userId) {
        try {
            const response = await this.fetchWithRetry(`${this.API_BASE_URL}/tickets/user/${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to get user tickets: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                success: true,
                tickets: data
            };
        }
        catch (error) {
            if (error instanceof Error) {
                await this.errorManager.handleError(error, 'get_user_tickets');
                return {
                    success: false,
                    error: error.message
                };
            }
            return {
                success: false,
                error: 'An unknown error occurred'
            };
        }
    }
    async fetchWithRetry(url, options) {
        let lastError = null;
        let attempt = 0;
        while (attempt < this.MAX_RETRIES) {
            try {
                const response = await fetch(url, options);
                if (response.ok) {
                    return response;
                }
                if (response.status === 401) {
                    throw new Error('Authentication required');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error occurred');
                console.error(`Fetch attempt ${attempt + 1} failed:`, error);
                if (attempt < this.MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                }
            }
            attempt++;
        }
        throw lastError || new Error('Max retries exceeded');
    }
}
exports.SupportSystem = SupportSystem;
//# sourceMappingURL=SupportSystem.js.map