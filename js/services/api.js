const API_BASE_URL = config.API_BASE_URL;

const apiService = {
    /**
     * Hàm gốc để gửi yêu cầu đến API, hỗ trợ cả tham số thường và mảng.
     * @param {string} endpoint - Đường dẫn API (ví dụ: '/articles/').
     * @param {object} options - Cấu hình cho fetch (method, headers, body).
     * @returns {Promise<object|null>} - Dữ liệu JSON từ API hoặc null nếu có lỗi.
     */
    async _request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                    ...options.headers,
                },
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

    // --- APIs cho Categories ---
    fetchCategories() {
        return this._fetch('/categories/');
    },

    // --- APIs cho Sources ---
    fetchSources() {
        return this._fetch('/sources/');
    },

    // --- APIs cho Keywords (CRUD) ---
    fetchKeywords(params) {
        return this._fetch('/keywords/', params);
    },

    /**
     * Tạo một từ khóa mới.
     * @param {object} data - Dữ liệu từ khóa mới { keyword_text, category_id }.
     * @returns {Promise<object>}
     */
    createKeyword(data) {
        return this._request('/keywords/', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Cập nhật một từ khóa đã có.
     * @param {number|string} keywordId - ID của từ khóa cần cập nhật.
     * @param {object} data - Dữ liệu cập nhật { keyword_text, category_id }.
     * @returns {Promise<object>}
     */
    updateKeyword(keywordId, data) {
        return this._request(`/keywords/${keywordId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Xóa một từ khóa.
     * @param {number|string} keywordId - ID của từ khóa cần xóa.
     * @returns {Promise<object>}
     */
    deleteKeyword(keywordId) {
        return this._request(`/keywords/${keywordId}`, {
            method: 'DELETE',
        });
    }
};