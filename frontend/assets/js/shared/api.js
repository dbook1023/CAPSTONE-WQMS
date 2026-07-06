/**
 * AquaMonitor API Service
 * Handles all communication with the Flask backend
 */

const API_BASE_URL = `${window.location.origin}/api/v1`;

function getStoredSession() {
    const adminSession = localStorage.getItem('aqua_monitor_admin_session');
    const userSession = localStorage.getItem('aqua_monitor_user_session');

    for (const sessionValue of [adminSession, userSession]) {
        if (!sessionValue) continue;

        try {
            return JSON.parse(sessionValue);
        } catch (error) {
            console.warn('Ignoring malformed stored session:', error);
        }
    }

    return null;
}

const API = {
    /**
     * Generic fetch wrapper
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Default headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available (future implementation)
        const session = getStoredSession();
        if (session) {
            const { token } = session;
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Something went wrong');
            }

            if (data && typeof data === 'object' && 'status' in data && 'data' in data) {
                return data.data;
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    },

    // Auth Endpoints
    auth: {
        login: (credentials) => API.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),
        logout: () => API.request('/auth/logout', { method: 'POST' })
    },

    // Sensor Endpoints
    sensors: {
        getAll: () => API.request('/sensors/'),
        getLatest: () => API.request('/sensors/latest'),
        getHistory: (fountainId, limit = 50) => API.request(`/sensors/history?fountain_id=${fountainId}&limit=${limit}`),
        update: (data) => API.request('/sensors/update', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        register: (data) => API.request('/sensors/register', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        delete: (id) => API.request(`/sensors/${id}`, { method: 'DELETE' })
    },

    // Fountain Endpoints
    fountains: {
        getAll: () => API.request('/fountains/'),
        getOne: (id) => API.request(`/fountains/${id}`),
        create: (data) => API.request('/fountains/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => API.request(`/fountains/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => API.request(`/fountains/${id}`, { method: 'DELETE' }),
        patchStatus: (id, status) => API.request(`/fountains/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        })
    },

    // Alert Endpoints
    alerts: {
        getAll: () => API.request('/alerts/'),
        getActive: () => API.request('/alerts/active'),
        resolve: (id, note) => API.request(`/alerts/resolve/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ note })
        }),
        create: (data) => API.request('/alerts/create', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // Settings Endpoints
    settings: {
        getAll: () => API.request('/settings/'),
        getThresholds: () => API.request('/settings/thresholds'),
        update: (data) => API.request('/settings/update', {
            method: 'PUT',
            body: JSON.stringify(data)
        })
    },

    // User Endpoints
    users: {
        getAll: () => API.request('/users/'),
        getOne: (id) => API.request(`/users/${id}`),
        getMe: () => API.request('/users/me'),
        create: (data) => API.request('/users/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => API.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => API.request(`/users/${id}`, { method: 'DELETE' }),
        getActivity: () => API.request('/users/activity')
    },

    // Admin Endpoints (separate admin table)
    admins: {
        getAll: () => API.request('/admins/'),
        getOne: (id) => API.request(`/admins/${id}`),
        create: (data) => API.request('/admins/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => API.request(`/admins/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => API.request(`/admins/${id}`, { method: 'DELETE' })
    },

    // Reports Endpoints
    reports: {
        getAll: async (includeArchived = false) => {
            const endpoint = includeArchived ? '/reports/?include_archived=true' : '/reports/';
            const reports = await API.request(endpoint);
            return Array.isArray(reports) ? reports : [];
        },
        getAnalytics: () => API.request('/reports/analytics'),
        create: (data) => API.request('/reports/', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        logDownload: (reportId, data = {}) => API.request(`/reports/${reportId}/download`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        archive: (id) => API.request(`/reports/${id}/archive`, {
            method: 'PATCH',
            body: JSON.stringify({ is_archived: true })
        })
    }
};

window.API = API;
