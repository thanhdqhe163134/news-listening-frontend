// app.js

document.addEventListener('DOMContentLoaded', () => {
    // === CÁC BIẾN VÀ HÀM CŨ (GIỮ NGUYÊN) ===
    const API_BASE_URL = 'https://759d11ba55a7.ngrok-free.app/api/v1';
    const categoriesList = document.getElementById('categories-list');
    const keywordsList = document.getElementById('keywords-list');
    
    // Hàm fetchData không đổi
    async function fetchData(endpoint) { /* ... */ }
    // Các hàm displayCategories và displayKeywords không đổi
    function displayCategories(categories) { /* ... */ }
    function displayKeywords(keywords) { /* ... */ }

    // === HÀM MỚI ĐỂ GỬI DỮ LIỆU (POST) ===
    async function postData(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data), // Chuyển object JS thành chuỗi JSON
            });
            // API của bạn trả về JSON ngay cả khi có lỗi, nên chúng ta cần đọc nó
            const result = await response.json(); 
            
            if (!response.ok) {
                // Lấy thông báo lỗi từ API (ví dụ: "Category already exists")
                throw new Error(result.detail || `Lỗi ${response.status}`);
            }
            return result; // API của bạn trả về { success: true, data: ..., message: ... }
        } catch (error) {
            console.error(`Không thể gửi dữ liệu tới ${endpoint}:`, error);
            // Ném lỗi ra ngoài để hàm gọi nó có thể bắt và xử lý
            throw error; 
        }
    }

    // === HÀM MỚI ĐỂ HIỂN THỊ THÔNG BÁO ===
    const alertContainer = document.getElementById('alert-container');
    function showAlert(message, type = 'success') {
        // type có thể là 'success' hoặc 'danger'
        const alert = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alert;

        // Cần có Bootstrap JS để nút close hoạt động, nhưng chúng ta có thể tự xóa sau vài giây
        setTimeout(() => {
            const alertNode = alertContainer.querySelector('.alert');
            if(alertNode) alertNode.remove();
        }, 4000); // 4 giây
    }

    // === LẮNG NGHE SỰ KIỆN SUBMIT FORM ===

    // 1. Form thêm danh mục
    const addCategoryForm = document.getElementById('add-category-form');
    addCategoryForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Ngăn trang reload khi submit
        const categoryNameInput = document.getElementById('category-name');
        const name = categoryNameInput.value.trim();

        if (!name) return;

        try {
            // DTO CategoryCreate yêu cầu một object có key là "name"
            const newData = { name: name };
            const result = await postData('/categories/', newData);
            
            showAlert(result.message, 'success'); // Hiển thị thông báo thành công
            categoryNameInput.value = ''; // Xóa nội dung trong input
            
            // Tải lại danh sách danh mục để cập nhật
            initialize(); 

        } catch (error) {
            showAlert(error.message, 'danger'); // Hiển thị thông báo lỗi
        }
    });

    // 2. Form thêm từ khóa
    const addKeywordForm = document.getElementById('add-keyword-form');
    addKeywordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const keywordTextInput = document.getElementById('keyword-text');
        const categoryIdInput = document.getElementById('keyword-category-id');

        const keyword_text = keywordTextInput.value.trim();
        const category_id = parseInt(categoryIdInput.value.trim(), 10);

        if (!keyword_text || !category_id) return;

        try {
            // DTO KeywordCreate yêu cầu "keyword_text" và "category_id"
            const newData = { keyword_text: keyword_text, category_id: category_id };
            const result = await postData('/keywords/', newData);
            
            showAlert(result.message, 'success');
            keywordTextInput.value = '';
            categoryIdInput.value = '';

            // Tải lại toàn bộ để cập nhật cả hai danh sách nếu cần
            initialize();

        } catch (error) {
            showAlert(error.message, 'danger');
        }
    });

    // === HÀM KHỞI TẠO (CẬP NHẬT) ===
    async function initialize() {
        // Tải và hiển thị danh sách
        const categories = await fetchData('/categories/');
        if (categories) displayCategories(categories);
        else categoriesList.innerHTML = '<li class="list-group-item text-danger">Không thể tải danh sách danh mục.</li>';

        const keywords = await fetchData('/keywords/');
        if (keywords) displayKeywords(keywords);
        else keywordsList.innerHTML = '<li class="list-group-item text-danger">Không thể tải danh sách từ khóa.</li>';
    }

    // Bắt đầu!
    initialize();
});