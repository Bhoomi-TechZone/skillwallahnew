import { getApiBaseUrl } from '../config/api';
import { getAuthHeaders } from '../utils/authUtils';

const API_BASE_URL = getApiBaseUrl();

class LiveSessionService {
    constructor() {
        this.baseURL = `${API_BASE_URL}/api/live-sessions`;
    }

    async createLiveSession(data) {
        const response = await fetch(`${this.baseURL}/`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to create session' }));
            throw new Error(error.detail || 'Failed to create session');
        }
        return await response.json();
    }

    async getLiveSessions() {
        const response = await fetch(`${this.baseURL}/`, {
            method: 'GET',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch sessions');
        return await response.json();
    }

    async deleteLiveSession(id) {
        const response = await fetch(`${this.baseURL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete session');
        return await response.json();
    }
    async updateSessionStatus(id, status) {
        const response = await fetch(`${this.baseURL}/${id}/status`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        if (!response.ok) throw new Error('Failed to update status');
        return await response.json();
    }
}

export const liveSessionService = new LiveSessionService();
