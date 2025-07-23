const API_BASE_URL = config.API_BASE_URL;

const apiService = {
    async _fetch(endpoint, params = {}) {
        const validParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== null && v !== ''));
        const urlParams = new URLSearchParams(validParams);
        
        try {
            // Sử dụng biến API_BASE_URL đã được lấy từ config
            const response = await fetch(`${API_BASE_URL}${endpoint}?${urlParams.toString()}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Lỗi từ API');
            return result;
        } catch (error) {
            console.error(`Lỗi khi tải từ ${endpoint}:`, error);
            const alertContainer = document.getElementById('alert-container');
            if (alertContainer) {
                alertContainer.innerHTML = `<div class="alert alert-danger">Không thể kết nối đến API. Vui lòng kiểm tra lại.</div>`;
            }
            return null;
        }
    },

    fetchArticles(params) {
        return this._fetch('/articles/', params);
    },

    fetchCategories() {
        return this._fetch('/categories/');
    },

    fetchKeywords(params) {
        return this._fetch('/keywords/', params);
    }
};