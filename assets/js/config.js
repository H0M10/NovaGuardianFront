

const CONFIG = {
    API_URL: 'http://localhost:8000',
    
    ENDPOINTS: {
        LOGIN: '/api/auth',
        DASHBOARD: '/api/dashboard',
        USUARIOS: '/api/usuarios',
        DISPOSITIVOS: '/api/dispositivos',
        EVENTOS: '/api/eventos',
        EXPORT: '/api/export'
    },
    
    
    STORAGE_KEYS: {
        TOKEN: 'novaguardian_token',
        USER: 'novaguardian_user'
    },
    
    
    POLLING_INTERVAL: 10000 
};


const Utils = {
    
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    },
    
    
    removeToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },
    
    
    clearAuth() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        localStorage.clear(); 
    },
    
    
    isAuthenticated() {
        return this.getToken() !== null;
    },
    
    
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
        }
    },
    
    
    async fetch(url, options = {}) {
        const token = this.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            const data = await response.json();
            
            
            if (response.status === 401) {
                this.removeToken();
                window.location.href = 'login.html';
                return null;
            }
            
            return data;
        } catch (error) {
            console.error('Error en petición:', error);
            return null;
        }
    },
    
    
    showAlert(container, message, type = 'danger') {
        const alertHtml = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        if (typeof container === 'string') {
            document.getElementById(container).innerHTML = alertHtml;
        } else {
            container.innerHTML = alertHtml;
        }
        
        
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    },
    
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('es-MX', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    
    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Hace un momento';
        if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} minutos`;
        if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
        return `Hace ${Math.floor(seconds / 86400)} días`;
    }
};

