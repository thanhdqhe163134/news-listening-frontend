document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        keywordsContainer: document.getElementById('keywords-by-category-container'),
        addKeywordBtn: document.getElementById('addKeywordBtn'),
        searchInput: document.getElementById('searchInput'),
        categoryFilter: document.getElementById('categoryFilterSelect'),
        alertContainer: document.getElementById('alert-container'),
    };

    const modalElement = document.getElementById('keywordModal');
    const keywordModal = new bootstrap.Modal(modalElement);
    const modalForm = {
        form: document.getElementById('keywordForm'),
        title: document.getElementById('keywordModalLabel'),
        keywordId: document.getElementById('keywordId'),
        keywordText: document.getElementById('keywordText'),
        categorySelect: document.getElementById('categorySelect'),
    };

    let categoryModalTomSelect;
    let categoryFilterTomSelect;

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Quản lý Từ khóa');
        dom.mainSidebar.innerHTML = createSidebar('keywords');
    }

    function renderCategorizedKeywords(categories, keywords) {
        if (!categories || categories.length === 0) {
            dom.keywordsContainer.innerHTML = '<div class="alert alert-info">Chưa có danh mục nào được tạo.</div>';
            return;
        }

        const keywordsByCatId = keywords.reduce((acc, kw) => {
            const catId = kw.category_id !== null && kw.category_id !== undefined ? kw.category_id : 'uncategorized';
            if (!acc[catId]) acc[catId] = [];
            acc[catId].push(kw);
            return acc;
        }, {});

        const hasFilter = dom.searchInput.value || categoryFilterTomSelect.getValue();

        const html = categories.map(cat => {
            const keywordsForCat = keywordsByCatId[cat.category_id] || [];
            
            // If filtering, don't show categories with no matching keywords
            if (hasFilter && keywordsForCat.length === 0) {
                return '';
            }

            const tagsHtml = keywordsForCat.length > 0
                ? keywordsForCat.map(kw => `
                    <span class="keyword-tag" 
                          data-id="${kw.keyword_id}" 
                          data-text="${kw.keyword_text}"
                          data-category-id="${kw.category?.category_id || ''}">
                        ${kw.keyword_text}
                        <span class="keyword-actions">
                            <i class="bi bi-pencil-square edit-icon" title="Sửa"></i>
                            <i class="bi bi-trash3-fill delete-icon" title="Xóa"></i>
                        </span>
                    </span>
                `).join('')
                : '<span class="text-muted fst-italic">Chưa có từ khóa nào trong danh mục này.</span>';

            return `
                <div class="category-group mb-4">
                    <h5 class="category-title">${cat.name}</h5>
                    <div class="keyword-tag-container">
                        ${tagsHtml}
                    </div>
                </div>
            `;
        }).join('');

        if (!html.trim() && hasFilter) {
            dom.keywordsContainer.innerHTML = `<div class="alert alert-warning">Không tìm thấy từ khóa nào phù hợp với tiêu chí lọc.</div>`;
        } else {
            dom.keywordsContainer.innerHTML = html;
        }
    }

    function showAlert(message, type = 'success') {
        const alertHtml = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>`;
        dom.alertContainer.innerHTML = alertHtml;
    }

    // === API & DATA LOGIC ===
    const fetchAndRender = debounce(async () => {
        dom.keywordsContainer.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary"></div></div>`;
        try {
            const filterParams = {
                search: dom.searchInput.value,
                category_id: categoryFilterTomSelect.getValue(),
                limit: 1000 // Fetch all keywords matching filter
            };
            
            // Fetch both categories and filtered keywords in parallel
            const [catResult, kwResult] = await Promise.all([
                apiService.fetchCategories(),
                apiService.fetchKeywords(filterParams)
            ]);

            const categories = (catResult && catResult.data) ? catResult.data : [];
            const keywords = (kwResult && kwResult.data) ? kwResult.data : [];

            renderCategorizedKeywords(categories, keywords);

        } catch (error) {
            showAlert('Không thể tải dữ liệu. Vui lòng kiểm tra lại API.', 'danger');
            dom.keywordsContainer.innerHTML = `<div class="alert alert-danger">Lỗi tải dữ liệu.</div>`;
        }
    }, 300);

    async function initializeSelectors() {
        const catResult = await apiService.fetchCategories();
        const categories = (catResult && catResult.data) ? catResult.data : [];

        categoryModalTomSelect = new TomSelect(modalForm.categorySelect, {
            valueField: 'category_id',
            labelField: 'name',
            searchField: 'name',
            options: categories,
        });

        categoryFilterTomSelect = new TomSelect(dom.categoryFilter, {
            valueField: 'category_id',
            labelField: 'name',
            searchField: 'name',
            options: categories,
            allowEmptyOption: true,
            placeholder: 'Lọc theo danh mục...',
            onChange: fetchAndRender
        });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const id = modalForm.keywordId.value;
        const data = {
            keyword_text: modalForm.keywordText.value,
            category_id: categoryModalTomSelect.getValue()
        };

        try {
            const result = id
                ? await apiService.updateKeyword(id, data)
                : await apiService.createKeyword(data);

            if (result && result.success) {
                showAlert(result.message || 'Thao tác thành công!');
                keywordModal.hide();
                fetchAndRender();
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
            modalForm.keywordId.value = '';
            modalForm.title.textContent = 'Thêm Từ khóa mới';
            categoryModalTomSelect.clear();
            keywordModal.show();
        });

        dom.keywordsContainer.addEventListener('click', e => {
            const editIcon = e.target.closest('.edit-icon');
            const deleteIcon = e.target.closest('.delete-icon');
            const tag = e.target.closest('.keyword-tag');

            if (!tag) return;

            const { id, text, categoryId } = tag.dataset;

            if (editIcon) {
                modalForm.form.reset();
                modalForm.title.textContent = 'Cập nhật Từ khóa';
                modalForm.keywordId.value = id;
                modalForm.keywordText.value = text;
                categoryModalTomSelect.setValue(categoryId);
                keywordModal.show();
            }

            if (deleteIcon) {
                if (confirm(`Bạn có chắc chắn muốn xóa từ khóa "${text}" không?`)) {
                    apiService.deleteKeyword(id).then(result => {
                        if (result && result.success) {
                            showAlert('Xóa từ khóa thành công!');
                            fetchAndRender();
                        } else {
                            showAlert(result?.message || 'Có lỗi xảy ra khi xóa', 'danger');
                        }
                    });
                }
            }
        });

        dom.searchInput.addEventListener('input', fetchAndRender);
        modalForm.form.addEventListener('submit', handleFormSubmit);
    }

    // === INITIALIZATION ===
    async function initialize() {
        renderLayout();
        await initializeSelectors();
        setupEventListeners();
        fetchAndRender();
    }

    initialize();
});