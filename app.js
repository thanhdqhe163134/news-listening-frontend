document.addEventListener('DOMContentLoaded', () => {
    // ================== CẤU HÌNH ==================
    const API_BASE_URL = 'https://759d11ba55a7.ngrok-free.app/api/v1';

    // ================== LẤY CÁC PHẦN TỬ DOM ==================
    const searchInput = document.getElementById('search-input');
    const sentimentFilter = document.getElementById('sentiment-filter');
    const sortBy = document.getElementById('sort-by');
    const sortOrderBtn = document.getElementById('sort-order-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const articlesList = document.getElementById('articles-list');
    const paginationControls = document.getElementById('pagination-controls');
    const alertContainer = document.getElementById('alert-container');

    // ================== QUẢN LÝ TRẠNG THÁI (STATE) ==================
    // Lưu trữ tất cả các tham số truy vấn hiện tại
    let queryState = {
        search: '',
        sentiment: '',
        category_id: null,
        keyword_id: null,
        sort_by: 'published_at',
        sort_order: 'desc',
        page: 1,
        size: 10
    };

    /**
     * Hàm chính để lấy và hiển thị các bài viết dựa trên `queryState`
     */
    async function fetchAndDisplayArticles() {
        // Hiển thị trạng thái đang tải
        articlesList.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Đang tải...</p></div>`;
        paginationControls.innerHTML = '';
        alertContainer.innerHTML = '';

        // Tạo chuỗi query string từ state
        const params = new URLSearchParams();
        Object.entries(queryState).forEach(([key, value]) => {
            if (value !== null && value !== '') {
                params.append(key, value);
            }
        });

        try {
            const response = await fetch(`${API_BASE_URL}/processed-articles/?${params.toString()}`, {
                method: 'GET',
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Lỗi không xác định');

            if (result.success && result.data.data.length > 0) {
                displayArticles(result.data.data);
                displayPagination(result.data);
            } else {
                articlesList.innerHTML = '';
                alertContainer.innerHTML = `<div class="alert alert-warning">Không tìm thấy bài viết nào phù hợp.</div>`;
            }
        } catch (error) {
            console.error('Lỗi khi tải bài viết:', error);
            articlesList.innerHTML = '';
            alertContainer.innerHTML = `<div class="alert alert-danger">Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.</div>`;
        }
    }

    /**
     * Hiển thị danh sách các bài viết
     * @param {Array} articles - Mảng các bài viết từ API
     */
    function displayArticles(articles) {
        articlesList.innerHTML = ''; // Xóa nội dung cũ
        articles.forEach(article => {
            const sentimentInfo = getSentimentInfo(article.sentiment);
            
            const categoriesHtml = article.categories.map(cat => 
                `<span class="badge me-1 tag category-tag" data-id="${cat.category_id}">${cat.name}</span>`
            ).join('');

            const keywordsHtml = article.keywords.map(kw => 
                `<span class="badge me-1 tag keyword-tag" data-id="${kw.keyword_id}">${kw.keyword_text}</span>`
            ).join('');

            const articleCard = `
                <div class="card shadow-sm article-card">
                    <div class="card-body">
                        <h5 class="card-title mb-1">${article.title}</h5>
                        <div class="mb-2 text-muted small">
                            <span>Ngày đăng: ${new Date(article.published_at).toLocaleDateString('vi-VN')}</span>
                            <span class="mx-2">|</span>
                            <span>Nguồn: ${article.source_id}</span>
                        </div>
                        <p class="card-text">${article.content_preview}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                ${categoriesHtml}
                                ${keywordsHtml}
                            </div>
                            <span class="badge ${sentimentInfo.class} fs-6">${sentimentInfo.icon} ${sentimentInfo.text}</span>
                        </div>
                         <a href="${article.url}" target="_blank" class="stretched-link"></a>
                    </div>
                </div>
            `;
            articlesList.insertAdjacentHTML('beforeend', articleCard);
        });
    }

    /**
     * Hiển thị thanh phân trang
     * @param {object} data - Đối tượng data từ API (chứa current_page, total_pages)
     */
    function displayPagination({ current_page, total_pages }) {
        if (total_pages <= 1) {
            paginationControls.innerHTML = '';
            return;
        }

        let paginationHtml = '<ul class="pagination">';
        // Nút Previous
        paginationHtml += `<li class="page-item ${current_page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${current_page - 1}">Trước</a></li>`;

        // Các nút số trang
        for (let i = 1; i <= total_pages; i++) {
            paginationHtml += `<li class="page-item ${i === current_page ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
        }

        // Nút Next
        paginationHtml += `<li class="page-item ${current_page === total_pages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${current_page + 1}">Sau</a></li>`;
        
        paginationHtml += '</ul>';
        paginationControls.innerHTML = paginationHtml;
    }
    
    /**
     * Trả về thông tin hiển thị cho sắc thái
     * @param {string} sentiment - 'positive', 'negative', hoặc 'neutral'
     */
    function getSentimentInfo(sentiment) {
        switch (sentiment) {
            case 'positive': return { text: 'Tích cực', class: 'bg-success-subtle text-success-emphasis', icon: '<i class="bi bi-emoji-smile"></i>' };
            case 'negative': return { text: 'Tiêu cực', class: 'bg-danger-subtle text-danger-emphasis', icon: '<i class="bi bi-emoji-frown"></i>' };
            default: return { text: 'Trung tính', class: 'bg-secondary-subtle text-secondary-emphasis', icon: '<i class="bi bi-emoji-neutral"></i>' };
        }
    }

    /**
     * Hàm debounce để tránh gọi API liên tục khi người dùng gõ tìm kiếm
     */
    function debounce(func, delay = 500) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // ================== GÁN CÁC EVENT LISTENER ==================

    // Tìm kiếm (với debounce)
    searchInput.addEventListener('input', debounce(e => {
        queryState.search = e.target.value;
        queryState.page = 1; // Reset về trang 1 khi tìm kiếm
        fetchAndDisplayArticles();
    }));

    // Lọc theo Sắc thái và Sắp xếp
    [sentimentFilter, sortBy].forEach(el => {
        el.addEventListener('change', () => {
            queryState.sentiment = sentimentFilter.value;
            queryState.sort_by = sortBy.value;
            queryState.page = 1;
            fetchAndDisplayArticles();
        });
    });

    // Thay đổi thứ tự sắp xếp
    sortOrderBtn.addEventListener('click', () => {
        const currentOrder = sortOrderBtn.dataset.order;
        const newOrder = currentOrder === 'desc' ? 'asc' : 'desc';
        sortOrderBtn.dataset.order = newOrder;
        sortOrderBtn.innerHTML = newOrder === 'desc' ? '<i class="bi bi-sort-down"></i>' : '<i class="bi bi-sort-up"></i>';
        queryState.sort_order = newOrder;
        queryState.page = 1;
        fetchAndDisplayArticles();
    });

    // Click vào các thẻ tag (category/keyword)
    articlesList.addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('tag')) {
            e.preventDefault();
            // Reset cả 2 trước khi set giá trị mới
            queryState.category_id = null;
            queryState.keyword_id = null;
            
            if (target.classList.contains('category-tag')) {
                queryState.category_id = target.dataset.id;
            } else if (target.classList.contains('keyword-tag')) {
                queryState.keyword_id = target.dataset.id;
            }
            queryState.page = 1;
            fetchAndDisplayArticles();
        }
    });

    // Click vào phân trang
    paginationControls.addEventListener('click', e => {
        e.preventDefault();
        if (e.target.tagName === 'A' && e.target.dataset.page) {
            const page = parseInt(e.target.dataset.page, 10);
            if (page !== queryState.page) {
                queryState.page = page;
                fetchAndDisplayArticles();
            }
        }
    });

    // Nút xóa bộ lọc
    resetFiltersBtn.addEventListener('click', () => {
        queryState = {
            ...queryState, // Giữ lại page size và sort order mặc định
            search: '',
            sentiment: '',
            category_id: null,
            keyword_id: null,
            page: 1,
            sort_by: 'published_at',
            sort_order: 'desc'
        };
        // Cập nhật lại UI của form
        searchInput.value = '';
        sentimentFilter.value = '';
        sortBy.value = 'published_at';
        sortOrderBtn.dataset.order = 'desc';
        sortOrderBtn.innerHTML = '<i class="bi bi-sort-down"></i>';

        fetchAndDisplayArticles();
    });

    // ================== KHỞI CHẠY LẦN ĐẦU ==================
    fetchAndDisplayArticles();
});