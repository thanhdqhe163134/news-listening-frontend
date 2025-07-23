document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        tableBody: document.getElementById('categoriesTableBody'),
        paginationControls: document.getElementById('pagination-controls'),
        addCategoryBtn: document.getElementById('addCategoryBtn'),
        searchInput: document.getElementById('searchInput'),
        alertContainer: document.getElementById('alert-container'),
        // Thêm tham chiếu đến tiêu đề cột có thể sắp xếp
        idColumnHeader: document.querySelector('.table-categories thead th:nth-child(1)'),
        nameColumnHeader: document.querySelector('.table-categories thead th:nth-child(2)'),
        keywordsCountColumnHeader: document.querySelector('.table-categories thead th:nth-child(4)'),
        createdAtColumnHeader: document.querySelector('.table-categories thead th:nth-child(5)'),
        updatedAtColumnHeader: document.querySelector('.table-categories thead th:nth-child(6)'),
    };

    const modalElement = document.getElementById('categoryModal');
    const categoryModal = new bootstrap.Modal(modalElement);
    const modalForm = {
        form: document.getElementById('categoryForm'),
        title: document.getElementById('categoryModalLabel'),
        categoryId: document.getElementById('categoryId'),
        categoryName: document.getElementById('categoryName'),
        categoryDescription: document.getElementById('categoryDescription'),
    };

    let allCategories = [];
    // Mặc định sắp xếp theo category_id tăng dần.
    let state = { page: 1, size: 10, sortColumn: 'category_id', sortDirection: 'asc' }; 

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    }

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Quản lý Danh mục');
        dom.mainSidebar.innerHTML = createSidebar('categories'); // 'categories' là key để active menu
    }

    function updateSortIcons() {
        document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());
        let currentHeaderElement;
        switch (state.sortColumn) {
            case 'category_id': currentHeaderElement = dom.idColumnHeader; break;
            case 'name': currentHeaderElement = dom.nameColumnHeader; break;
            case 'keywords_count': currentHeaderElement = dom.keywordsCountColumnHeader; break;
            case 'created_at': currentHeaderElement = dom.createdAtColumnHeader; break;
            case 'updated_at': currentHeaderElement = dom.updatedAtColumnHeader; break;
            default: return;
        }

        if (currentHeaderElement) {
            const iconClass = state.sortDirection === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
            const icon = document.createElement('i');
            icon.classList.add('bi', iconClass, 'ms-2', 'sort-icon');
            currentHeaderElement.appendChild(icon);
        }
    }

    function renderTable(categoriesOnPage) {
        if (!categoriesOnPage || categoriesOnPage.length === 0) {
            const searchText = dom.searchInput.value;
            const message = searchText ? `Không tìm thấy danh mục nào cho "${searchText}".` : 'Chưa có danh mục nào.';
            dom.tableBody.innerHTML = `<tr><td colspan="7" class="text-center">${message}</td></tr>`;
            return;
        }

        const rowsHtml = categoriesOnPage.map(cat => `
            <tr>
                <th scope="row" class="text-center">${cat.category_id}</th>
                <td class="fw-medium">${cat.name}</td>
                <td>${cat.description || '<span class="text-muted">Không có mô tả</span>'}</td>
                <td class="text-center"><span class="badge bg-info-subtle text-info-emphasis">${cat.keywords_count || 0}</span></td>
                <td class="text-center">${formatDate(cat.created_at)}</td>
                <td class="text-center">${formatDate(cat.updated_at)}</td>
                <td class="text-center action-btn-group">
                    <button class="btn btn-sm btn-outline-primary action-btn edit-btn" title="Sửa"
                            data-id="${cat.category_id}" 
                            data-name="${cat.name}"
                            data-description="${cat.description || ''}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger action-btn delete-btn" title="Xóa" 
                            data-id="${cat.category_id}"
                            data-name="${cat.name}">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        dom.tableBody.innerHTML = rowsHtml;
        updateSortIcons();
    }

    function renderCurrentPage() {
        const start = (state.page - 1) * state.size;
        const end = start + state.size;
        const categoriesOnPage = allCategories.slice(start, end);
        renderTable(categoriesOnPage);
        dom.paginationControls.innerHTML = createPagination({
            page: state.page,
            pages: Math.ceil(allCategories.length / state.size),
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
    async function fetchAndRenderCategories() {
        dom.tableBody.innerHTML = `<tr><td colspan="7" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>`;
        try {
            const searchParam = dom.searchInput.value;
            const result = await apiService.fetchCategories({ search: searchParam });
            if (result && result.success && Array.isArray(result.data)) {
                allCategories = result.data;
                applySorting();
                state.page = 1;
                renderCurrentPage();
            } else {
                allCategories = [];
                renderCurrentPage();
            }
        } catch (error) {
            showAlert('Không thể tải dữ liệu danh mục. Vui lòng kiểm tra lại API.', 'danger');
            allCategories = [];
            renderCurrentPage();
        }
    }

    function applySorting() {
        allCategories.sort((a, b) => {
            let valA, valB;
            switch (state.sortColumn) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
                    if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
                    return 0;
                case 'keywords_count':
                    valA = a.keywords_count || 0;
                    valB = b.keywords_count || 0;
                    break;
                case 'created_at':
                    valA = a.created_at ? new Date(a.created_at).getTime() : 0;
                    valB = b.created_at ? new Date(b.created_at).getTime() : 0;
                    break;
                case 'updated_at':
                    valA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
                    valB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
                    break;
                default: // category_id
                    valA = a.category_id;
                    valB = b.category_id;
                    break;
            }
            return state.sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const id = modalForm.categoryId.value;
        const data = {
            name: modalForm.categoryName.value,
            description: modalForm.categoryDescription.value
        };

        try {
            const result = id 
                ? await apiService.updateCategory(id, data) 
                : await apiService.createCategory(data);

            if (result && result.success) {
                showAlert(result.message || `Thao tác thành công!`);
                categoryModal.hide();
                fetchAndRenderCategories();
            } else {
                showAlert(result?.message || 'Có lỗi xảy ra', 'danger');
            }
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    }

    // === EVENT LISTENERS ===
    function setupEventListeners() {
        dom.addCategoryBtn.addEventListener('click', () => {
            modalForm.form.reset();
            modalForm.categoryId.value = '';
            modalForm.title.textContent = 'Thêm Danh mục mới';
            categoryModal.show();
        });
        
        dom.tableBody.addEventListener('click', e => {
            const editBtn = e.target.closest('.edit-btn');
            const deleteBtn = e.target.closest('.delete-btn');

            if (editBtn) {
                modalForm.form.reset();
                modalForm.title.textContent = 'Cập nhật Danh mục';
                modalForm.categoryId.value = editBtn.dataset.id;
                modalForm.categoryName.value = editBtn.dataset.name;
                modalForm.categoryDescription.value = editBtn.dataset.description;
                categoryModal.show();
            }

            if (deleteBtn) {
                const categoryId = deleteBtn.dataset.id;
                const categoryName = deleteBtn.dataset.name;
                if (confirm(`Bạn có chắc chắn muốn xóa danh mục "${categoryName}" không?`)) {
                    apiService.deleteCategory(categoryId).then(result => {
                        if (result && result.success) {
                            showAlert('Xóa danh mục thành công!');
                            fetchAndRenderCategories();
                        } else {
                             showAlert(result?.message || 'Có lỗi xảy ra khi xóa', 'danger');
                        }
                    });
                }
            }
        });

        dom.searchInput.addEventListener('input', debounce(fetchAndRenderCategories, 300));
        
        dom.paginationControls.addEventListener('click', e => {
            const pageLink = e.target.closest('a.page-link');
            if (pageLink && pageLink.dataset.page) {
                e.preventDefault();
                state.page = parseInt(pageLink.dataset.page, 10);
                renderCurrentPage();
            }
        });

        modalForm.form.addEventListener('submit', handleFormSubmit);

        // Listeners for sorting
        const sortableHeaders = {
            'category_id': dom.idColumnHeader,
            'name': dom.nameColumnHeader,
            'keywords_count': dom.keywordsCountColumnHeader,
            'created_at': dom.createdAtColumnHeader,
            'updated_at': dom.updatedAtColumnHeader
        };

        for (const [column, header] of Object.entries(sortableHeaders)) {
            header.addEventListener('click', () => handleSortClick(column));
        }
    }

    function handleSortClick(column) {
        if (state.sortColumn === column) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
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
        setupEventListeners();
        fetchAndRenderCategories();
    }

    initialize();
});