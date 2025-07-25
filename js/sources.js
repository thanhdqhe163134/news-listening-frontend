document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        tableBody: document.getElementById('sourcesTableBody'),
        paginationControls: document.getElementById('pagination-controls'),
        addSourceBtn: document.getElementById('addSourceBtn'),
        searchInput: document.getElementById('searchInput'),
        filterBy: document.getElementById('filterBy'),
        filterValueContainer: document.getElementById('filter-value-container'),
        platformFilter: document.getElementById('platformFilter'),
        sourceTypeFilter: document.getElementById('sourceTypeFilter'),
        statusFilter: document.getElementById('statusFilter'),
        resetFiltersBtn: document.getElementById('resetFiltersBtn'),
        alertContainer: document.getElementById('alert-container'),
        sortableHeaders: document.querySelectorAll('.sortable-header'),
    };

    const modalElement = document.getElementById('sourceModal');
    const sourceModal = new bootstrap.Modal(modalElement);
    const modalForm = {
        form: document.getElementById('sourceForm'),
        title: document.getElementById('sourceModalLabel'),
        sourceId: document.getElementById('sourceId'),
        sourceName: document.getElementById('sourceName'),
        sourceUrl: document.getElementById('sourceUrl'),
        sourceType: document.getElementById('sourceType'),
        platform: document.getElementById('platform'),
        status: document.getElementById('status'),
    };

    // Application state
    let state = {
        page: 1,
        size: 10,
        search: '',
        sort_by: 'source_id',
        sort_order: 'asc',
        filter_by: '',
        filter_value: ''
    };
    
    // Mappings for display names
    const platformDisplayNames = {
        'News': 'Báo chí',
        'Facebook': 'Facebook',
        'PublicProcurement': 'Mua sắm công',
        'Shopee': 'Shopee',
        'Blog': 'Blog'
    };
    
    // NEW: Mapping for status names
    const statusDisplayNames = {
        'ACTIVE': 'Đang hoạt động',
        'INACTIVE': 'Không hoạt động'
    };

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Quản lý Nguồn tin');
        dom.mainSidebar.innerHTML = createSidebar('sources');
    }

    function updateSortIcons() {
        dom.sortableHeaders.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            header.querySelector('.sort-icon')?.remove();
        });
        const activeHeader = document.querySelector(`.sortable-header[data-sort="${state.sort_by}"]`);
        if (activeHeader) {
            const iconClass = state.sort_order === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
            const icon = document.createElement('i');
            icon.classList.add('bi', iconClass, 'ms-2', 'sort-icon');
            activeHeader.appendChild(icon);
        }
    }

    function renderTable(sources, total) {
        if (!sources || sources.length === 0) {
            const message = state.search || state.filter_value ? `Không tìm thấy kết quả phù hợp.` : 'Chưa có nguồn tin nào.';
            dom.tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4">${message}</td></tr>`;
            return;
        }

        const rowsHtml = sources.map(src => {
            // UPDATED: Use statusDisplayNames for the text inside the badge
            const statusText = statusDisplayNames[src.status] || src.status;
            const statusBadge = `<a href="#" class="badge rounded-pill text-decoration-none filter-link ${src.status === 'ACTIVE' ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'}" data-filter-by="status" data-filter-value="${src.status}">${statusText}</a>`;
            
            const platformLink = `<a href="#" class="filter-link" data-filter-by="platform" data-filter-value="${src.platform}">${platformDisplayNames[src.platform] || src.platform}</a>`;
            const typeLink = `<a href="#" class="filter-link" data-filter-by="source_type" data-filter-value="${src.source_type}">${src.source_type}</a>`;

            return `
            <tr>
                <th scope="row" class="text-center">${src.source_id}</th>
                <td><a href="${src.source_url}" target="_blank" rel="noopener noreferrer" title="${src.source_url}">${src.source_name}</a></td>
                <td class="text-center"><span class="badge bg-info-subtle text-info-emphasis">${src.article_count || 0}</span></td>
                <td class="text-center">${typeLink}</td>
                <td class="text-center">${platformLink}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center small">${formatDate(src.last_crawled_at)}</td>
                <td class="text-center action-btn-group">
                    <button class="btn btn-sm btn-outline-primary action-btn edit-btn" title="Sửa" data-id="${src.source_id}"><i class="bi bi-pencil-square"></i></button>
                    <button class="btn btn-sm btn-outline-danger action-btn delete-btn" title="Xóa" data-id="${src.source_id}" data-name="${src.source_name}"><i class="bi bi-trash3-fill"></i></button>
                </td>
            </tr>
        `}).join('');
        dom.tableBody.innerHTML = rowsHtml;
    }

    function showAlert(message, type = 'success') {
        const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
        dom.alertContainer.innerHTML = alertHtml;
    }

    // === API & DATA LOGIC ===
    async function fetchAndRenderSources() {
        dom.tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>`;
        try {
            const params = { ...state };
            if (!params.filter_by || !params.filter_value) {
                delete params.filter_by;
                delete params.filter_value;
            }
            const result = await apiService.fetchSources(params);
            if (result && result.success && Array.isArray(result.data)) {
                const totalItems = result.total !== undefined ? result.total : result.data.length;
                renderTable(result.data, totalItems);
                dom.paginationControls.innerHTML = createPagination({ page: state.page, pages: Math.ceil(totalItems / state.size) });
            } else {
                renderTable([], 0);
                dom.paginationControls.innerHTML = '';
            }
        } catch (error) {
            showAlert(`Không thể tải dữ liệu: ${error.message}`, 'danger');
            renderTable([], 0);
            dom.paginationControls.innerHTML = '';
        } finally {
            updateSortIcons();
        }
    }
    
 async function fetchSourceForEdit(id) {
        // Gọi thẳng đến API lấy 1 record bằng ID
        const result = await apiService.fetchSource(id); 
        // Dữ liệu trả về từ API này nằm trong result.data
        if(result && result.success && result.data) {
            return result.data;
        }
        // Nếu không có kết quả thì trả về null
        return null;
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const id = modalForm.sourceId.value;
        const data = {
            source_name: modalForm.sourceName.value,
            source_url: modalForm.sourceUrl.value,
            source_type: modalForm.sourceType.value,
            platform: modalForm.platform.value,
            status: modalForm.status.value,
        };
        try {
            const result = id ? await apiService.updateSource(id, data) : await apiService.createSource(data);
            if (result && result.success) {
                showAlert(result.message || 'Thao tác thành công!');
                sourceModal.hide();
                fetchAndRenderSources();
            } else {
                showAlert(result?.message || 'Có lỗi xảy ra', 'danger');
            }
        } catch (error) {
            showAlert(error.message, 'danger');
        }
    }
    
    function updateFilterValueUI() {
        const filterType = dom.filterBy.value;
        dom.platformFilter.classList.add('d-none');
        dom.sourceTypeFilter.classList.add('d-none');
        dom.statusFilter.classList.add('d-none');
        
        let activeFilterDropdown = null;

        if (filterType === 'platform') {
            activeFilterDropdown = dom.platformFilter;
        } else if (filterType === 'source_type') {
            activeFilterDropdown = dom.sourceTypeFilter;
        } else if (filterType === 'status') {
             activeFilterDropdown = dom.statusFilter;
        }

        if(activeFilterDropdown) {
             activeFilterDropdown.classList.remove('d-none');
             activeFilterDropdown.value = state.filter_value;
        }
    }

    // === EVENT LISTENERS ===
    function setupEventListeners() {
        dom.addSourceBtn.addEventListener('click', () => {
            modalForm.form.reset();
            modalForm.sourceId.value = '';
            modalForm.title.textContent = 'Thêm Nguồn tin mới';
            sourceModal.show();
        });

        dom.tableBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const source = await fetchSourceForEdit(editBtn.dataset.id);
                if (source) {
                    modalForm.form.reset();
                    modalForm.title.textContent = 'Cập nhật Nguồn tin';
                    modalForm.sourceId.value = source.source_id;
                    modalForm.sourceName.value = source.source_name;
                    modalForm.sourceUrl.value = source.source_url;
                    modalForm.sourceType.value = source.source_type;
                    modalForm.platform.value = source.platform;
                    modalForm.status.value = source.status;
                    sourceModal.show();
                } else {
                    showAlert('Không tìm thấy thông tin nguồn để sửa.', 'danger');
                }
            }
            
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const sourceId = deleteBtn.dataset.id;
                const sourceName = deleteBtn.dataset.name;
                if (confirm(`Bạn có chắc chắn muốn xóa nguồn tin "${sourceName}" không?`)) {
                    apiService.deleteSource(sourceId).then(result => {
                        if (result && result.success) {
                            showAlert('Xóa nguồn tin thành công!');
                            fetchAndRenderSources();
                        } else {
                            showAlert(result?.message || 'Có lỗi xảy ra khi xóa', 'danger');
                        }
                    });
                }
            }

            const filterLink = e.target.closest('.filter-link');
            if(filterLink) {
                e.preventDefault();
                state.page = 1;
                state.filter_by = filterLink.dataset.filterBy;
                state.filter_value = filterLink.dataset.filterValue;
                dom.filterBy.value = state.filter_by;
                updateFilterValueUI();
                fetchAndRenderSources();
            }
        });
        
        dom.searchInput.addEventListener('input', debounce(() => {
            state.page = 1;
            state.search = dom.searchInput.value.trim();
            fetchAndRenderSources();
        }, 300));
        
        dom.filterBy.addEventListener('change', () => {
            state.page = 1;
            state.filter_by = dom.filterBy.value;
            state.filter_value = '';
            updateFilterValueUI();
            if(!state.filter_by) {
                fetchAndRenderSources();
            }
        });

        [dom.platformFilter, dom.sourceTypeFilter, dom.statusFilter].forEach(el => {
            el.addEventListener('change', (e) => {
                state.page = 1;
                state.filter_value = e.target.value;
                fetchAndRenderSources();
            });
        });

        dom.resetFiltersBtn.addEventListener('click', () => {
            state.search = '';
            state.filter_by = '';
            state.filter_value = '';
            state.page = 1;
            dom.searchInput.value = '';
            dom.filterBy.value = '';
            updateFilterValueUI();
            fetchAndRenderSources();
        });

        dom.paginationControls.addEventListener('click', e => {
            const pageLink = e.target.closest('a.page-link');
            if (pageLink && !pageLink.parentElement.classList.contains('disabled')) {
                e.preventDefault();
                state.page = parseInt(pageLink.dataset.page, 10);
                fetchAndRenderSources();
            }
        });

        modalForm.form.addEventListener('submit', handleFormSubmit);

        dom.sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const sortColumn = header.dataset.sort;
                if (state.sort_by === sortColumn) {
                    state.sort_order = state.sort_order === 'asc' ? 'desc' : 'asc';
                } else {
                    state.sort_by = sortColumn;
                    state.sort_order = 'asc';
                }
                state.page = 1;
                fetchAndRenderSources();
            });
        });
    }

    // === INITIALIZATION ===
    function initialize() {
        renderLayout();
        setupEventListeners();
        updateFilterValueUI();
        fetchAndRenderSources();
    }

    initialize();
});