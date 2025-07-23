document.addEventListener('DOMContentLoaded', () => {
    // =================================================================
    // ==                     PHẦN CẤU HÌNH                           ==
    // =================================================================
    const API_BASE_URL = 'https://759d11ba55a7.ngrok-free.app/api/v1'; // URL ngrok của bạn

    // =================================================================
    // ==              LẤY CÁC PHẦN TỬ HTML (DOM)                     ==
    // =================================================================
    const dom = {
        articleSearchInput: document.getElementById('article-search-input'),
        keywordSearchInput: document.getElementById('keyword-search-input'),
        keywordSuggestions: document.getElementById('keyword-suggestions'),
        sentimentFilter: document.getElementById('sentiment-filter'),
        sortBy: document.getElementById('sort-by'),
        sortOrderBtn: document.getElementById('sort-order-btn'),
        resetFiltersBtn: document.getElementById('reset-filters-btn'),
        articlesList: document.getElementById('articles-list'),
        paginationControls: document.getElementById('pagination-controls'),
        alertContainer: document.getElementById('alert-container'),
        categoryFilterList: document.getElementById('category-filter-list'),
    };

    // =================================================================
    // ==               QUẢN LÝ TRẠNG THÁI BỘ LỌC (STATE)             ==
    // =================================================================
    let queryState = {
        search: '',
        sentiment: '',
        category_id: null,
        crawl_keyword_id: null,
        sort_by: 'published_at',
        sort_order: 'desc',
        page: 1,
        size: 10
    };

    const debounce = (func, delay = 500) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    // =================================================================
    // ==                 CÁC HÀM GỌI API (FETCH)                     ==
    // =================================================================
    async function fetchFromApi(endpoint, params = {}) {
        const validParams = Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== null && v !== ''));
        const urlParams = new URLSearchParams(validParams);
        
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}?${urlParams.toString()}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Lỗi từ API');
            return result;
        } catch (error) {
            console.error(`Lỗi khi tải từ ${endpoint}:`, error);
            dom.alertContainer.innerHTML = `<div class="alert alert-danger">Không thể kết nối đến API. Vui lòng kiểm tra lại.</div>`;
            return null;
        }
    }

    // =================================================================
    // ==            CÁC HÀM HIỂN THỊ DỮ LIỆU (RENDER)                 ==
    // =================================================================
    function renderArticles(articles) {
        dom.articlesList.innerHTML = '';
        if (!articles || articles.length === 0) {
            dom.articlesList.innerHTML = `<div class="alert alert-warning text-center">Không tìm thấy bài viết nào phù hợp.</div>`;
            return;
        }
        articles.forEach(article => {
            const categoryHtml = article.category ? `<span class="badge bg-primary-subtle text-primary-emphasis me-1 tag" data-type="category" data-id="${article.category.category_id}">${article.category.name}</span>` : '';
            const keywordsHtml = (article.keywords || []).map(kw => `<span class="badge bg-secondary-subtle text-secondary-emphasis me-1 tag" data-type="keyword" data-id="${kw.keyword_id}">${kw.keyword_text}</span>`).join('');
            
            dom.articlesList.insertAdjacentHTML('beforeend', `
                <div class="card article-card shadow-sm">
                    <div class="card-body">
                        <h5 class="card-title">${article.title}</h5>
                        <p class="card-subtitle mb-2 text-muted small">
                            <strong>Nguồn:</strong> ${article.source?.source_name || 'N/A'} | 
                            <strong>Ngày:</strong> ${new Date(article.published_at).toLocaleDateString('vi-VN')}
                        </p>
                        <p class="card-text small">${(article.content || '').substring(0, 200)}...</p>
                        <div class="d-flex justify-content-between align-items-end mt-3">
                            <div class="tags-container">${categoryHtml}${keywordsHtml}</div>
                        </div>
                        <a href="${article.url}" target="_blank" class="stretched-link" title="Đọc bài viết gốc"></a>
                    </div>
                </div>`);
        });
    }

    /**
     * === CẢI TIẾN LỚN: HÀM PHÂN TRANG THÔNG MINH ===
     * Hiển thị một số lượng trang giới hạn, có nút First, Prev, Next, Last và dấu ...
     */
    function renderPagination(paginationData) {
        const { page: currentPage, pages: totalPages } = paginationData;
        if (totalPages <= 1) {
            dom.paginationControls.innerHTML = '';
            return;
        }

        const createPageItem = (p, text = p, active = false, disabled = false) => 
            `<li class="page-item ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${p}">${text}</a>
            </li>`;

        const createEllipsisItem = () => `<li class="page-item disabled"><span class="page-link">...</span></li>`;

        const windowSize = 2; // Số trang hiển thị ở mỗi bên của trang hiện tại
        let paginationHtml = '<ul class="pagination pagination-sm">';

        // Nút Previous
        paginationHtml += createPageItem(currentPage - 1, '&laquo;', false, currentPage === 1);

        // Nút trang đầu tiên
        if (currentPage > windowSize + 1) {
            paginationHtml += createPageItem(1);
            paginationHtml += createEllipsisItem();
        }

        // Các trang ở giữa
        for (let i = Math.max(1, currentPage - windowSize); i <= Math.min(totalPages, currentPage + windowSize); i++) {
            paginationHtml += createPageItem(i, i, i === currentPage);
        }

        // Nút trang cuối cùng
        if (currentPage < totalPages - windowSize) {
             paginationHtml += createEllipsisItem();
            paginationHtml += createPageItem(totalPages);
        }
        
        // Nút Next
        paginationHtml += createPageItem(currentPage + 1, '&raquo;', false, currentPage === totalPages);
        paginationHtml += '</ul>';
        dom.paginationControls.innerHTML = paginationHtml;
    }


    function renderFilterTags(container, items, type, nameField, idField) {
        container.innerHTML = (items || []).map(item => `
            <span class="badge tag filter-tag" data-type="${type}" data-id="${item[idField]}">${item[nameField]}</span>
        `).join(' ');
    }

    function renderKeywordSuggestions(keywords) {
        if (!keywords || keywords.length === 0) {
            dom.keywordSuggestions.style.display = 'none';
            return;
        }
        dom.keywordSuggestions.innerHTML = keywords.map(kw => 
            `<a href="#" class="list-group-item list-group-item-action suggestion-item" data-id="${kw.keyword_id}">${kw.keyword_text}</a>`
        ).join('');
        dom.keywordSuggestions.style.display = 'block';
    }

    function updateActiveFilterUI() {
        document.querySelectorAll('.filter-tag').forEach(tag => {
            const { type, id } = tag.dataset;
            const isActive = (type === 'category' && id == queryState.category_id);
            tag.classList.toggle('active', isActive);
        });
        
        if (!queryState.crawl_keyword_id) {
           dom.keywordSearchInput.value = '';
        }
    }
    
    // =================================================================
    // ==                    LOGIC XỬ LÝ CHÍNH                        ==
    // =================================================================
    async function fetchArticles() {
        dom.articlesList.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
        dom.alertContainer.innerHTML = '';
        
        const params = {
            page: queryState.page,
            size: queryState.size,
            sort_by: queryState.sort_by,
            sort_order: queryState.sort_order,
            search: queryState.search,
            sentiment: queryState.sentiment,
            category_id: queryState.category_id,
            crawl_keyword_id: queryState.crawl_keyword_id,
        };

        const result = await fetchFromApi('/articles/', params);
        
        if (result && result.data && result.data.items) {
            renderArticles(result.data.items);
            renderPagination(result.data);
        } else {
            renderArticles([]);
            renderPagination({ page: 1, pages: 0 });
        }
        updateActiveFilterUI();
    }
    
    function handleFilterChange(updates) {
        queryState = { ...queryState, ...updates, page: 1 };
        fetchArticles();
    }

    // Đổi tên hàm cho rõ nghĩa
    function handlePageChange(updates) {
        queryState = { ...queryState, ...updates };
        fetchArticles();
    }

    const debouncedKeywordSearch = debounce(async (searchText) => {
        if (searchText.length < 2) {
            renderKeywordSuggestions([]);
            return;
        }
        const result = await fetchFromApi('/keywords/', { search: searchText, limit: 5 });
        if (result && result.data) {
            renderKeywordSuggestions(result.data);
        }
    }, 300);

    // =================================================================
    // ==           GÁN CÁC HÀM XỬ LÝ SỰ KIỆN (EVENT LISTENERS)        ==
    // =================================================================
    dom.articleSearchInput.addEventListener('input', debounce(e => handleFilterChange({ search: e.target.value })));
    dom.keywordSearchInput.addEventListener('input', e => {
        if (e.target.value === '') {
            handleFilterChange({ crawl_keyword_id: null });
        }
        debouncedKeywordSearch(e.target.value);
    });
    
    dom.keywordSuggestions.addEventListener('click', e => {
        e.preventDefault();
        const target = e.target.closest('.suggestion-item');
        if (target) {
            const keywordId = target.dataset.id;
            const keywordText = target.textContent;
            dom.keywordSearchInput.value = keywordText;
            dom.keywordSuggestions.style.display = 'none';
            handleFilterChange({ crawl_keyword_id: keywordId, category_id: null });
        }
    });

    document.addEventListener('click', e => {
        const target = e.target.closest('a.page-link, span.tag');
        if (!target) return;

        // Xử lý click cho phân trang
        if (target.matches('.page-link[data-page]')) {
            e.preventDefault();
            // Không thực hiện hành động nếu nút bị vô hiệu hóa (disabled)
            if (target.parentElement.classList.contains('disabled')) return;
            handlePageChange({ page: parseInt(target.dataset.page) });
        }

        // Xử lý click cho TẤT CẢ các thẻ (tags)
        if (target.classList.contains('tag')) {
            e.preventDefault();
            const { type, id } = target.dataset;
            const isActive = (type === 'category' && id == queryState.category_id) || (type === 'keyword' && id == queryState.crawl_keyword_id);
            
            let updates = { category_id: null, crawl_keyword_id: null };
            if (!isActive) {
                if (type === 'category') updates.category_id = id;
                else if (type === 'keyword') {
                    updates.crawl_keyword_id = id;
                    dom.keywordSearchInput.value = target.textContent;
                }
            }
            handleFilterChange(updates);
        }
        
        // Ẩn suggestion box khi click ra ngoài
        if (!dom.keywordSearchInput.contains(e.target) && !dom.keywordSuggestions.contains(e.target)) {
            dom.keywordSuggestions.style.display = 'none';
        }
    });

    dom.resetFiltersBtn.addEventListener('click', () => {
        queryState = {
            search: '', sentiment: '', category_id: null, crawl_keyword_id: null,
            sort_by: 'published_at', sort_order: 'desc', page: 1, size: 10
        };
        dom.articleSearchInput.value = '';
        dom.sentimentFilter.value = '';
        dom.sortBy.value = 'published_at';
        dom.sortOrderBtn.dataset.order = 'desc';
        dom.sortOrderBtn.innerHTML = '<i class="bi bi-sort-down"></i>';
        fetchArticles();
    });
    
    dom.sentimentFilter.addEventListener('change', () => handleFilterChange({ sentiment: dom.sentimentFilter.value }));
    dom.sortBy.addEventListener('change', () => handleFilterChange({ sort_by: dom.sortBy.value }));

    dom.sortOrderBtn.addEventListener('click', () => {
        const newOrder = dom.sortOrderBtn.dataset.order === 'desc' ? 'asc' : 'desc';
        dom.sortOrderBtn.dataset.order = newOrder;
        dom.sortOrderBtn.innerHTML = newOrder === 'desc' ? '<i class="bi bi-sort-down"></i>' : '<i class="bi bi-sort-up"></i>';
        handleFilterChange({ sort_order: newOrder });
    });

    // =================================================================
    // ==                    KHỞI TẠO ỨNG DỤNG                        ==
    // =================================================================
    async function initialize() {
        const categoriesRes = await fetchFromApi('/categories/');
        if (categoriesRes && categoriesRes.data) {
            renderFilterTags(dom.categoryFilterList, categoriesRes.data, 'category', 'name', 'category_id');
        }
        fetchArticles();
    }

    initialize();
});