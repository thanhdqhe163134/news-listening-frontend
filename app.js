document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // THAY THẾ DÒNG DƯỚI ĐÂY BẰNG URL NGROK CỦA BẠN
    // Ví dụ: const API_BASE_URL = 'https://abcd-1234-efgh.ngrok-free.app/api/v1';
    // =================================================================
    const API_BASE_URL = 'https://759d11ba55a7.ngrok-free.app/api/v1';


    // Lấy các phần tử HTML để tương tác
    const categoriesList = document.getElementById('categories-list');
    const keywordsList = document.getElementById('keywords-list');
    const alertContainer = document.getElementById('alert-container');
    const addCategoryForm = document.getElementById('add-category-form');
    const addKeywordForm = document.getElementById('add-keyword-form');

    /**
     * Hàm chung để lấy dữ liệu từ API (phương thức GET)
     * @param {string} endpoint - Đường dẫn API (ví dụ: '/categories/')
     * @returns {Promise<Array|null>} - Mảng dữ liệu hoặc null nếu có lỗi
     */
    async function fetchData(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    // Header quan trọng để bỏ qua trang cảnh báo của ngrok
                    'ngrok-skip-browser-warning': 'true'
                }
            });

            const result = await response.json(); // Luôn cố gắng đọc JSON
            
            if (!response.ok) {
                // Nếu có lỗi, sử dụng thông báo lỗi từ API
                throw new Error(result.detail || `Lỗi mạng: ${response.status}`);
            }
            if (!result.success) {
                throw new Error(result.message || 'API trả về lỗi nhưng không có thông báo.');
            }
            return result.data;
        } catch (error) {
            console.error(`Không thể tải dữ liệu từ ${endpoint}:`, error);
            showAlert(error.message, 'danger'); // Hiển thị lỗi ra giao diện
            return null;
        }
    }

    /**
     * Hàm chung để gửi dữ liệu lên API (phương thức POST)
     * @param {string} endpoint - Đường dẫn API (ví dụ: '/keywords/')
     * @param {object} data - Dữ liệu cần gửi đi (dạng object)
     * @returns {Promise<object>} - Kết quả trả về từ API
     */
    async function postData(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Header quan trọng để bỏ qua trang cảnh báo của ngrok
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.detail || `Lỗi mạng: ${response.status}`);
            }
            return result;
        } catch (error) {
            console.error(`Không thể gửi dữ liệu tới ${endpoint}:`, error);
            // Ném lỗi ra để hàm gọi nó có thể bắt và hiển thị thông báo
            throw error;
        }
    }

    /**
     * Hiển thị danh sách danh mục lên giao diện
     * @param {Array<object>} categories - Mảng các đối tượng danh mục
     */
    function displayCategories(categories) {
        categoriesList.innerHTML = '';
        if (!categories || categories.length === 0) {
            categoriesList.innerHTML = '<li class="list-group-item">Không có danh mục nào.</li>';
            return;
        }
        categories.forEach(category => {
            const item = document.createElement('li');
            item.className = 'list-group-item d-flex justify-content-between align-items-center';
            item.innerHTML = `
                ${category.name}
                <span class="badge bg-primary rounded-pill">${category.category_id}</span>
            `;
            categoriesList.appendChild(item);
        });
    }

    /**
     * Hiển thị danh sách từ khóa lên giao diện
     * @param {Array<object>} keywords - Mảng các đối tượng từ khóa
     */
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

    /**
     * Hiển thị một thông báo tạm thời trên màn hình
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo ('success' hoặc 'danger')
     */
    function showAlert(message, type = 'success') {
        const alert = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alert;

        setTimeout(() => {
            const alertNode = alertContainer.querySelector('.alert');
            if (alertNode) alertNode.remove();
        }, 5000); // Tự động ẩn sau 5 giây
    }
    
    /**
     * Hàm chính, khởi tạo và tải toàn bộ dữ liệu ban đầu
     */
    async function initialize() {
        // Tải đồng thời cả hai danh sách
        const [categories, keywords] = await Promise.all([
            fetchData('/categories/'),
            fetchData('/keywords/')
        ]);

        if (categories) {
            displayCategories(categories);
        } else {
            categoriesList.innerHTML = '<li class="list-group-item text-danger">Không thể tải danh sách danh mục.</li>';
        }

        if (keywords) {
            displayKeywords(keywords);
        } else {
            keywordsList.innerHTML = '<li class="list-group-item text-danger">Không thể tải danh sách từ khóa.</li>';
        }
    }

    // --- LẮNG NGHE CÁC SỰ KIỆN CỦA FORM ---

    // Xử lý khi form thêm danh mục được gửi đi
    addCategoryForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Ngăn trang tải lại
        const categoryNameInput = document.getElementById('category-name');
        const name = categoryNameInput.value.trim();
        if (!name) return;

        try {
            const newData = { name: name };
            const result = await postData('/categories/', newData);
            showAlert(result.message || 'Thêm danh mục thành công!', 'success');
            categoryNameInput.value = ''; // Xóa input
            initialize(); // Tải lại dữ liệu
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    });

    // Xử lý khi form thêm từ khóa được gửi đi
    addKeywordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const keywordTextInput = document.getElementById('keyword-text');
        const categoryIdInput = document.getElementById('keyword-category-id');
        const keyword_text = keywordTextInput.value.trim();
        const category_id = parseInt(categoryIdInput.value.trim(), 10);

        if (!keyword_text || isNaN(category_id)) {
            showAlert('Vui lòng nhập đầy đủ từ khóa và ID danh mục hợp lệ.', 'danger');
            return;
        }

        try {
            const newData = { keyword_text: keyword_text, category_id: category_id };
            const result = await postData('/keywords/', newData);
            showAlert(result.message || 'Thêm từ khóa thành công!', 'success');
            keywordTextInput.value = '';
            categoryIdInput.value = '';
            initialize(); // Tải lại dữ liệu
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    });

    // --- BẮT ĐẦU CHẠY ỨNG DỤNG ---
    initialize();
});