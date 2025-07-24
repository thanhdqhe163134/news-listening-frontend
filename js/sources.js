document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        tableBody: document.getElementById('sourcesTableBody'),
        paginationControls: document.getElementById('pagination-controls'),
        addSourceBtn: document.getElementById('addSourceBtn'),
        searchInput: document.getElementById('searchInput'),
        alertContainer: document.getElementById('alert-container'),
        idColumnHeader: document.querySelector('.table-sources thead th:nth-child(1)'),
        nameColumnHeader: document.querySelector('.table-sources thead th:nth-child(2)'),
        lastCrawledAtColumnHeader: document.querySelector('.table-sources thead th:nth-child(7)'),
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

    let masterSourceList = []; // Lưu trữ toàn bộ danh sách nguồn tin
    let displayedSources = []; // Lưu trữ danh sách đã được lọc và sắp xếp
    let state = { page: 1, size: 10, sortColumn: 'source_id', sortDirection: 'asc' };

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
        document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());
        let currentHeaderElement;
        switch (state.sortColumn) {
            case 'source_id': currentHeaderElement = dom.idColumnHeader; break;
            case 'source_name': currentHeaderElement = dom.nameColumnHeader; break;
            case 'last_crawled_at': currentHeaderElement = dom.lastCrawledAtColumnHeader; break;
        }
        if (currentHeaderElement) {
            const iconClass = state.sortDirection === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
            const icon = document.createElement('i');
            icon.classList.add('bi', iconClass, 'ms-2', 'sort-icon');
            currentHeaderElement.appendChild(icon);
        }
    }

    function renderTable(sourcesOnPage) {
        if (!sourcesOnPage || sourcesOnPage.length === 0) {
            const searchText = dom.searchInput.value;
            const message = searchText ? `Không tìm thấy nguồn tin nào cho "${searchText}".` : 'Chưa có nguồn tin nào.';
            dom.tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-4">${message}</td></tr>`;
            return;
        }

        const rowsHtml = sourcesOnPage.map(src => {
            const statusBadge = src.status === 'ACTIVE'
                ? `<span class="badge bg-success-subtle text-success-emphasis rounded-pill">ACTIVE</span>`
                : `<span class="badge bg-danger-subtle text-danger-emphasis rounded-pill">INACTIVE</span>`;

            // Sử dụng source_url thay cho home_url để khớp với API response mới
            return `
            <tr>
                <th scope="row" class="text-center">${src.source_id}</th>
                <td class="fw-medium">${src.source_name}</td>
                <td><a href="${src.source_url}" target="_blank" rel="noopener noreferrer" title="${src.source_url}">${src.source_url}</a></td>
                <td class="text-center">${src.source_type}</td>
                <td class="text-center">${src.platform}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center small">${formatDate(src.last_crawled_at)}</td>
                <td class="text-center action-btn-group">
                    <button class="btn btn-sm btn-outline-primary action-btn edit-btn" title="Sửa"
                            data-id="${src.source_id}"
                            data-name="${src.source_name}"
                            data-url="${src.source_url}"
                            data-type="${src.source_type}"
                            data-platform="${src.platform}"
                            data-status="${src.status}">
                        <i class="bi bi-pencil-square"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger action-btn delete-btn" title="Xóa"
                            data-id="${src.source_id}"
                            data-name="${src.source_name}">
                        <i class="bi bi-trash3-fill"></i>
                    </button>
                </td>
            </tr>
        `}).join('');
        dom.tableBody.innerHTML = rowsHtml;
        updateSortIcons();
    }

    function processAndRenderSources() {
        const searchTerm = dom.searchInput.value.toLowerCase().trim();

        // Lọc từ danh sách gốc (masterSourceList)
        displayedSources = masterSourceList.filter(src =>
            src.source_name.toLowerCase().includes(searchTerm) ||
            src.source_url.toLowerCase().includes(searchTerm)
        );

        applySorting(); // Sắp xếp danh sách đã lọc

        // Phân trang trên danh sách đã lọc và sắp xếp
        const start = (state.page - 1) * state.size;
        const end = start + state.size;
        const sourcesOnPage = displayedSources.slice(start, end);

        renderTable(sourcesOnPage);
        dom.paginationControls.innerHTML = createPagination({
            page: state.page,
            pages: Math.ceil(displayedSources.length / state.size),
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
    async function fetchAllSources() {
        dom.tableBody.innerHTML = `<tr><td colspan="8" class="text-center p-5"><div class="spinner-border text-primary"></div></td></tr>`;
        try {
            const result = await apiService.fetchSources(); // Fetch all sources without any params
            if (result && result.success && Array.isArray(result.data)) {
                masterSourceList = result.data;
                processAndRenderSources(); // Initial render
            } else {
                masterSourceList = [];
                processAndRenderSources();
            }
        } catch (error) {
            showAlert('Không thể tải dữ liệu nguồn tin. Vui lòng kiểm tra lại API.', 'danger');
            masterSourceList = [];
            processAndRenderSources();
        }
    }

    function applySorting() {
        displayedSources.sort((a, b) => {
            let valA, valB;
            switch (state.sortColumn) {
                case 'source_name':
                    valA = a.source_name.toLowerCase();
                    valB = b.source_name.toLowerCase();
                    return state.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'last_crawled_at':
                    valA = a.last_crawled_at ? new Date(a.last_crawled_at).getTime() : 0;
                    valB = b.last_crawled_at ? new Date(b.last_crawled_at).getTime() : 0;
                    break;
                default:
                    valA = a.source_id;
                    valB = b.source_id;
                    break;
            }
            return state.sortDirection === 'asc' ? valA - valB : valB - valA;
        });
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
            const result = id
                ? await apiService.updateSource(id, data)
                : await apiService.createSource(data);

            if (result && result.success) {
                showAlert(result.message || 'Thao tác thành công!');
                sourceModal.hide();
                fetchAllSources(); // Tải lại toàn bộ dữ liệu
            } else {
                showAlert(result?.message || 'Có lỗi xảy ra', 'danger');
            }
        } catch (error) {
            showAlert(error.message, 'danger');
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

        dom.tableBody.addEventListener('click', e => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                modalForm.form.reset();
                modalForm.title.textContent = 'Cập nhật Nguồn tin';
                modalForm.sourceId.value = editBtn.dataset.id;
                modalForm.sourceName.value = editBtn.dataset.name;
                modalForm.sourceUrl.value = editBtn.dataset.url;
                modalForm.sourceType.value = editBtn.dataset.type;
                modalForm.platform.value = editBtn.dataset.platform;
                modalForm.status.value = editBtn.dataset.status;
                sourceModal.show();
            }

            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const sourceId = deleteBtn.dataset.id;
                const sourceName = deleteBtn.dataset.name;
                if (confirm(`Bạn có chắc chắn muốn xóa nguồn tin "${sourceName}" không?`)) {
                    apiService.deleteSource(sourceId).then(result => {
                        if (result && result.success) {
                            showAlert('Xóa nguồn tin thành công!');
                            fetchAllSources(); // Tải lại toàn bộ dữ liệu
                        } else {
                            showAlert(result?.message || 'Có lỗi xảy ra khi xóa', 'danger');
                        }
                    });
                }
            }
        });

        dom.searchInput.addEventListener('input', debounce(() => {
            state.page = 1; // Reset về trang đầu khi tìm kiếm
            processAndRenderSources();
        }, 300));

        dom.paginationControls.addEventListener('click', e => {
            const pageLink = e.target.closest('a.page-link');
            if (pageLink && pageLink.dataset.page) {
                e.preventDefault();
                state.page = parseInt(pageLink.dataset.page, 10);
                processAndRenderSources();
            }
        });

        modalForm.form.addEventListener('submit', handleFormSubmit);

        const sortableHeaders = {
            'source_id': dom.idColumnHeader,
            'source_name': dom.nameColumnHeader,
            'last_crawled_at': dom.lastCrawledAtColumnHeader,
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
        state.page = 1;
        processAndRenderSources();
    }

    function initialize() {
        renderLayout();
        setupEventListeners();
        fetchAllSources();
    }

    initialize();
});