const API_BASE_URL = config.API_BASE_URL;

const apiService = {
    async _request(endpoint, options = {}) {
        const token = getCookie('accessToken');
        const headers = {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...options.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers,
                ...options,
            });

            if (response.status === 204) { // Xử lý cho trường hợp xóa thành công (No Content)
                return { success: true, message: 'Xóa thành công.' };
            }

            const result = await response.json();
            if (!response.ok) {
                // Ưu tiên hiển thị lỗi từ message của API
                throw new Error(result.message || result.detail || 'Có lỗi không xác định từ API.');
            }
            return result;

        } catch (error) {
            console.error(`Lỗi khi thực hiện yêu cầu đến ${endpoint}:`, error);
            // Ném lỗi ra ngoài để hàm gọi có thể bắt và xử lý
            throw error;
        }
    },

    /**
     * Hàm fetch đã được tối ưu hóa để xử lý tham số dạng mảng.
     * @param {string} endpoint - Đường dẫn API.
     * @param {object} params - Các tham số truy vấn.
     * @returns {Promise<object|null>}
     */
    async _fetch(endpoint, params = {}) {
        const urlParams = new URLSearchParams();
        for (const key in params) {
            const value = params[key];
            if (value !== null && value !== '' && value !== undefined) {
                if (Array.isArray(value)) {
                    value.forEach(item => urlParams.append(key, item));
                } else {
                    urlParams.append(key, value);
                }
            }
        }
        const queryString = urlParams.toString();
        const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this._request(fullEndpoint, { method: 'GET' });
    },

    // --- APIs cho Articles ---
    fetchArticles(params) {
        return this._fetch('/articles/', params);
    },

    crawlArticles() {
        return this._request('/articles/crawl', { method: 'POST' });
    },

    scrapeTables(url, page) {
        return this._request('/scrape/tables', {
            method: 'POST',
            body: JSON.stringify({ url: url, pages: page }),
        });
    },
    
    getProcurementLinks(items) {
        // Calls the new endpoint shown in your screenshots
        return this._request('/procurement/get-links', {
            method: 'POST',
            body: JSON.stringify(items),
        });
    },

    // --- APIs cho Categories ---
    fetchCategories() {
        return this._fetch('/categories/');
    },

    // --- APIs cho Sources ---
    fetchSources(params) {
        return this._fetch('/sources/', params);
    },
    
    createSource(data) {
        return this._request('/sources/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    
    updateSource(sourceId, data) {
        return this._request(`/sources/${sourceId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteSource(sourceId) {
        return this._request(`/sources/${sourceId}`, {
            method: 'DELETE',
        });
    },
    
    fetchSource(sourceId) {
        return this._fetch(`/sources/${sourceId}`);
    },

    // --- APIs cho Keywords (CRUD) ---
    fetchKeywords(params) {
        return this._fetch('/keywords/', params);
    },
    
    createKeyword(data) {
        return this._request('/keywords/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    
    updateKeyword(keywordId, data) {
        return this._request(`/keywords/${keywordId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    deleteKeyword(keywordId) {
        return this._request(`/keywords/${keywordId}`, {
            method: 'DELETE',
        });
    },

    // --- APIs cho Dashboard ---
    fetchDashboardStats() {
        return this._fetch('/dashboard/stats');
    },

    fetchSentimentDistribution() {
        return this._fetch('/dashboard/sentiment-distribution');
    },

    fetchSentimentOverTime(period = 'day') {
        return this._fetch('/dashboard/sentiment-over-time', { period });
    },

    fetchTopCategories(limit = 5) {
        return this._fetch('/dashboard/top-categories', { limit });
    },

    fetchTopKeywords(limit = 10) {
        return this._fetch('/dashboard/top-keywords', { limit });
    },
    
    // --- APIs cho Categories (CRUD) ---
    fetchCategory(categoryId) {
        return this._fetch(`/categories/${categoryId}`);
    },
    
    createCategory(data) {
        return this._request('/categories/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    
    updateCategory(categoryId, data) {
        return this._request(`/categories/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    
    deleteCategory(categoryId) {
        return this._request(`/categories/${categoryId}`, {
            method: 'DELETE',
        });
    },
    getSavedArticleIds() {
        return this._request('/users/me/saved-articles/');
    },

    fetchSavedArticles() {
        return this._request('/users/me/saved-articles/details');
    },

    saveArticle(articleId) {
        return this._request('/users/me/saved-articles/', {
            method: 'POST',
            body: JSON.stringify({ article_id: articleId }),
        });
    },

    unsaveArticle(articleId) {
        return this._request(`/users/me/saved-articles/${articleId}`, {
            method: 'DELETE',
        });
    },

    fetchUserProcurements() {
        return this._request('/user-procurements/', { method: 'GET' });
    },

    saveUserProcurement(procurementData) {
        return this._request('/user-procurements/', {
            method: 'POST',
            body: JSON.stringify(procurementData)
        });
    },

    deleteUserProcurement(userProcurementId) {
        return this._request(`/user-procurements/${userProcurementId}`, {
            method: 'DELETE'
        });
    }
};