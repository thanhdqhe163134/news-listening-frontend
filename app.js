// app.js

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://759d11ba55a7.ngrok-free.app/api/v1';

    // Thay vì get div, bây giờ ta get ul
    const categoriesList = document.getElementById('categories-list');
    const keywordsList = document.getElementById('keywords-list');

    async function fetchData(endpoint) {
        // ... (hàm này giữ nguyên, không thay đổi)
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            if (!response.ok) {
                throw new Error(`Lỗi mạng! Status: ${response.status}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'API trả về lỗi.');
            }
            return result.data;
        } catch (error) {
            console.error(`Không thể tải dữ liệu từ ${endpoint}:`, error);
            return null;
        }
    }
    
    // CẬP NHẬT: Hàm hiển thị danh mục để dùng class của Bootstrap
    function displayCategories(categories) {
        categoriesList.innerHTML = ''; 
        if (!categories || categories.length === 0) {
            categoriesList.innerHTML = '<li class="list-group-item">Không có danh mục nào.</li>';
            return;
        }

        categories.forEach(category => {
            // Tạo một thẻ <li> với các class của Bootstrap
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                ${category.name}
                <span class="badge bg-primary rounded-pill">${category.category_id}</span>
            `;
            categoriesList.appendChild(item);
        });
    }

    // CẬP NHẬT: Hàm hiển thị từ khóa để dùng class của Bootstrap
    function displayKeywords(keywords) {
        keywordsList.innerHTML = '';
        if (!keywords || keywords.length === 0) {
            keywordsList.innerHTML = '<li class="list-group-item">Không có từ khóa nào.</li>';
            return;
        }

        keywords.forEach(keyword => {
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                ${keyword.keyword_text}
                <span class="badge bg-secondary rounded-pill">Category ID: ${keyword.category_id}</span>
            `;
            keywordsList.appendChild(item);
        });
    }

    async function initialize() {
        const categories = await fetchData('/categories/');
        if (categories) {
            displayCategories(categories);
        } else {
             categoriesList.innerHTML = '<li class="list-group-item text-danger">Không thể tải danh sách danh mục.</li>';
        }

        const keywords = await fetchData('/keywords/');
        if (keywords) {
            displayKeywords(keywords);
        } else {
            keywordsList.innerHTML = '<li class="list-group-item text-danger">Không thể tải danh sách từ khóa.</li>';
        }
    }

    initialize();
});