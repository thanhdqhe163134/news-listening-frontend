document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        tableBody: document.getElementById('keywordsTableBody'),
        paginationControls: document.getElementById('pagination-controls'),
        addKeywordBtn: document.getElementById('addKeywordBtn'),
        searchInput: document.getElementById('searchInput'),
        alertContainer: document.getElementById('alert-container'),
        // Thêm tham chiếu đến tiêu đề cột ID, Ngày tạo, Ngày cập nhật
        idColumnHeader: document.querySelector('.table-keywords thead th:nth-child(1)'),
        createdAtColumnHeader: document.querySelector('.table-keywords thead th:nth-child(4)'), // Cột Ngày tạo
        updatedAtColumnHeader: document.querySelector('.table-keywords thead th:nth-child(5)'), // Cột Ngày cập nhật
    };

    const modalElement = document.getElementById('keywordModal');
    const keywordModal = new bootstrap.Modal(modalElement);
    const modalForm = {
        form: document.getElementById('keywordForm'),
        title: document.getElementById('keywordModalLabel'),
        keywordId: document.getElementById('keywordId'), // Input ẩn để lưu ID khi sửa
        keywordText: document.getElementById('keywordText'),
        categorySelect: document.getElementById('categorySelect'),
    };

    let categoryTomSelect;
    let allKeywords = [];
    // Cập nhật state để bao gồm sortColumn và sortDirection mặc định
    // Mặc định sắp xếp theo keyword_id tăng dần.
    let state = { page: 1, size: 10, sortColumn: 'keyword_id', sortDirection: 'asc' }; 

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Quản lý Từ khóa');
        dom.mainSidebar.innerHTML = createSidebar('keywords');
    }

    // Hàm để cập nhật mũi tên sắp xếp trên tiêu đề cột
    function updateSortIcons() {
        // Xóa tất cả các mũi tên cũ
        document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());

        // Xác định header element tương ứng với cột đang được sắp xếp
        let currentHeaderElement;
        switch (state.sortColumn) {
            case 'keyword_id':
                currentHeaderElement = dom.idColumnHeader;
                break;
            case 'created_at':
                currentHeaderElement = dom.createdAtColumnHeader;
                break;
            case 'updated_at':
                currentHeaderElement = dom.updatedAtColumnHeader;
                break;
            default:
                currentHeaderElement = null;
        }

        // Thêm mũi tên vào cột hiện tại đang được sắp xếp
        if (currentHeaderElement) {
            let iconClass = state.sortDirection === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
            const icon = document.createElement('i');
            icon.classList.add('bi', iconClass, 'ms-2', 'sort-icon');
            currentHeaderElement.appendChild(icon);
        }
    }

    function renderTable(keywordsOnPage) {
        if (!keywordsOnPage || keywordsOnPage.length === 0) {
            const searchText = dom.searchInput.value;
            const message = searchText ? `Không tìm thấy từ khóa nào cho "${searchText}".` : 'Không có từ khóa nào.';
            dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center">${message}</td></tr>`;
            return;
        }

        const rowsHtml = keywordsOnPage.map(kw => `
            <tr>
                <th scope="row">${kw.keyword_id}</th>
                <td>${kw.keyword_text}</td>
                <td><span class="badge bg-secondary-subtle text-secondary-emphasis">${kw.category?.name || 'N/A'}</span></td>
                <td>${formatDate(kw.created_at)}</td>
                <td>${formatDate(kw.updated_at)}</td>
                <td class="text-center action-btn-group">
                    <button class="btn btn-sm btn-outline-primary action-btn edit-btn" title="Sửa"
                            data-id="${kw.keyword_id}" 
                            data-text="${kw.keyword_text}"
                            data-category-id="${kw.category?.category_id || ''}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger action-btn delete-btn" title="Xóa" 
                            data-id="${kw.keyword_id}"
                            data-text="${kw.keyword_text}">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        dom.tableBody.innerHTML = rowsHtml;
        updateSortIcons(); // Cập nhật icon sau khi render bảng
    }

    function renderCurrentPage() {
        const start = (state.page - 1) * state.size;
        const end = start + state.size;
        const keywordsOnPage = allKeywords.slice(start, end);
        renderTable(keywordsOnPage);
        dom.paginationControls.innerHTML = createPagination({
            page: state.page,
            pages: Math.ceil(allKeywords.length / state.size),
        });
    }
    
    function showAlert(message, type = 'success') {
        const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
        dom.alertContainer.innerHTML = alertHtml;
    }

    // === API & DATA LOGIC ===
    async function fetchAndRenderKeywords() {
        dom.tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>`;
        try {
            const searchParam = dom.searchInput.value;
            const result = await apiService.fetchKeywords({ search: searchParam });
            if (result && result.success && Array.isArray(result.data)) {
                allKeywords = result.data; // Lấy dữ liệu thô
                applySorting(); // Áp dụng sắp xếp sau khi lấy dữ liệu
                state.page = 1;
                renderCurrentPage();
            } else {
                allKeywords = [];
                renderCurrentPage();
            }
        } catch (error) {
            showAlert('Không thể tải dữ liệu từ khóa. Vui lòng kiểm tra lại API.', 'danger');
            allKeywords = [];
            renderCurrentPage();
        }
    }

    // Hàm sắp xếp dữ liệu
    function applySorting() {
        allKeywords.sort((a, b) => {
            let comparison = 0;
            switch (state.sortColumn) {
                case 'keyword_id':
                    comparison = a.keyword_id - b.keyword_id;
                    break;
                case 'created_at':
                    // Convert date strings to Date objects for proper comparison
                    const dateA_created = a.created_at ? new Date(a.created_at).getTime() : 0;
                    const dateB_created = b.created_at ? new Date(b.created_at).getTime() : 0;
                    comparison = dateA_created - dateB_created;
                    break;
                case 'updated_at':
                    // Convert date strings to Date objects for proper comparison
                    const dateA_updated = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    const dateB_updated = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    comparison = dateA_updated - dateB_updated;
                    break;
                // Có thể thêm các trường hợp sắp xếp cho các cột khác nếu cần
            }
            return state.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    async function fetchCategories() {
        const result = await apiService.fetchCategories();
        return (result && result.data) ? result.data : [];
    }

    async function initializeCategorySelect() {
        const categories = await fetchCategories();
        categoryTomSelect = new TomSelect(modalForm.categorySelect, {
            valueField: 'category_id',
            labelField: 'name',
            searchField: 'name',
            options: categories,
            create: false,
            closeAfterSelect: true
        });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const id = modalForm.keywordId.value;
        const data = {
            keyword_text: modalForm.keywordText.value,
            category_id: categoryTomSelect.getValue()
        };

        try {
            let result;
            if (id) { // Chế độ Sửa (PUT)
                result = await apiService.updateKeyword(id, data);
            } else { // Chế độ Thêm (POST)
                result = await apiService.createKeyword(data);
            }

            if (result && result.success) {
                showAlert(result.message || `Thao tác thành công!`);
                keywordModal.hide();
                fetchAndRenderKeywords();
            } else {
                showAlert(result?.message || 'Có lỗi xảy ra', 'danger');
            }
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    }

    // === EVENT LISTENERS ===
    function setupEventListeners() {
        dom.addKeywordBtn.addEventListener('click', () => {
            modalForm.form.reset();
            modalForm.keywordId.value = ''; // Xóa ID để form ở chế độ Thêm mới
            modalForm.title.textContent = 'Thêm Từ khóa mới';
            categoryTomSelect.clear();
            keywordModal.show();
        });
        
        // Thêm lại event listener cho các nút Sửa và Xóa
        dom.tableBody.addEventListener('click', e => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (editBtn) {
                modalForm.form.reset();
                modalForm.title.textContent = 'Cập nhật Từ khóa';
                modalForm.keywordId.value = editBtn.dataset.id; // Gán ID để form ở chế độ Sửa
                modalForm.keywordText.value = editBtn.dataset.text;
                categoryTomSelect.setValue(editBtn.dataset.categoryId);
                keywordModal.show();
            }

            if (deleteBtn) {
                const keywordId = deleteBtn.dataset.id;
                const keywordText = deleteBtn.dataset.text;
                if (confirm(`Bạn có chắc chắn muốn xóa từ khóa "${keywordText}" không?`)) {
                    apiService.deleteKeyword(keywordId).then(result => {
                        if (result && result.success) {
                            showAlert('Xóa từ khóa thành công!');
                            fetchAndRenderKeywords(); // Tải lại danh sách sau khi xóa
                        } else {
                             showAlert(result?.message || 'Có lỗi xảy ra khi xóa', 'danger');
                        }
                    });
                }
            }
        });

        dom.searchInput.addEventListener('input', debounce(fetchAndRenderKeywords, 300));
        
        dom.paginationControls.addEventListener('click', e => {
            const pageLink = e.target.closest('a.page-link');
            if (pageLink && pageLink.dataset.page) {
                e.preventDefault();
                state.page = parseInt(pageLink.dataset.page, 10);
                renderCurrentPage();
            }
        });

        modalForm.form.addEventListener('submit', handleFormSubmit);

        // Listener cho cột ID
        dom.idColumnHeader.addEventListener('click', () => {
            handleSortClick('keyword_id');
        });

        // Listener cho cột Ngày tạo
        dom.createdAtColumnHeader.addEventListener('click', () => {
            handleSortClick('created_at');
        });

        // Listener cho cột Ngày cập nhật
        dom.updatedAtColumnHeader.addEventListener('click', () => {
            handleSortClick('updated_at');
        });
    }

    // Hàm xử lý chung khi click vào tiêu đề cột để sắp xếp
    function handleSortClick(column) {
        if (state.sortColumn === column) {
            // Nếu click lại vào cùng một cột, đảo ngược chiều sắp xếp
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Nếu click vào cột khác, đặt cột đó là cột sắp xếp và mặc định là tăng dần
            state.sortColumn = column;
            state.sortDirection = 'asc';
        }
        
        applySorting(); 
        state.page = 1; 
        renderCurrentPage(); 
    }
    
    // === INITIALIZATION ===
    async function initialize() {
        renderLayout();
        await initializeCategorySelect();
        setupEventListeners();
        fetchAndRenderKeywords();
    }

    initialize();
});