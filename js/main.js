document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const dom = {
        header: document.getElementById('header-container'),
        mainSidebar: document.getElementById('main-sidebar-container'),
        filterSidebar: document.getElementById('filter-sidebar-container'),
        articlesList: document.getElementById('articles-list'),
        paginationControls: document.getElementById('pagination-controls'),
        alertContainer: document.getElementById('alert-container'),
    };

    let filterDom = {};
    let selectedKeywords = [];
    let tomSelectInstances = {};

    function renderLayout() {
        dom.header.innerHTML = createHeader('Article Analysis Dashboard');
        dom.mainSidebar.innerHTML = createSidebar('news');
        dom.filterSidebar.innerHTML = createFilterSidebar();
        // --- FIX IS HERE: Call initializeAuthUI which is now async ---
        initializeAuthUI();

        filterDom = {
            articleSearchInput: document.getElementById('article-search-input'),
            sourceFilter: document.getElementById('source-filter'),
            keywordSearchInput: document.getElementById('keyword-search-input'),
            keywordSuggestions: document.getElementById('keyword-suggestions'),
            sentimentFilter: document.getElementById('sentiment-filter'),
            sortBy: document.getElementById('sort-by'),
            sortOrderBtn: document.getElementById('sort-order-btn'),
            resetFiltersBtn: document.getElementById('reset-filters-btn'),
            categoryFilterList: document.getElementById('category-filter-list'),
            selectedKeywordContainer: document.getElementById('selected-keyword-container'),
            keywordInputWrapper: document.getElementById('keyword-input-wrapper'),
            startDateFilter: document.getElementById('start-date-filter'),
            endDateFilter: document.getElementById('end-date-filter'),
        };
    }

    async function initializeTomSelects() {
        tomSelectInstances.source = new TomSelect(filterDom.sourceFilter, { placeholder: 'Chọn một nguồn...' });
        tomSelectInstances.sentiment = new TomSelect(filterDom.sentimentFilter, {});
        tomSelectInstances.sortBy = new TomSelect(filterDom.sortBy, {});
    }

    // --- REFACTORED AND FIXED FUNCTION ---
    async function handleSaveToggle(saveContainer) {
        const articleId = parseInt(saveContainer.dataset.articleId, 10);
        if (!articleId) return;

        // Disable button to prevent multiple clicks
        saveContainer.style.pointerEvents = 'none';
        const icon = saveContainer.querySelector('.save-icon');
        const isSaved = saveContainer.classList.contains('saved');

        try {
            if (isSaved) {
                // --- Unsave Action ---
                await apiService.unsaveArticle(articleId);
                savedArticleIds.delete(articleId); // Update state
                // Update UI immediately
                saveContainer.classList.remove('saved');
                icon.classList.remove('bi-bookmark-fill');
                icon.classList.add('bi-bookmark');
                saveContainer.title = 'Lưu bài viết';
            } else {
                // --- Save Action ---
                await apiService.saveArticle(articleId);
                savedArticleIds.add(articleId); // Update state
                // Update UI immediately
                saveContainer.classList.add('saved');
                icon.classList.remove('bi-bookmark');
                icon.classList.add('bi-bookmark-fill');
                saveContainer.title = 'Bỏ lưu bài viết';
            }
        } catch (error) {
            if (error.message.includes('401') || error.message.toLowerCase().includes('validate credentials')) {
                 showAlert('Vui lòng đăng nhập để lưu bài viết.', 'warning');
            } else {
                 showAlert(`Lỗi: ${error.message}`, 'danger');
            }
        } finally {
            // Re-enable button after action
            saveContainer.style.pointerEvents = 'auto';
        }
    }

    async function fetchAndRenderArticles() {
        dom.articlesList.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
        dom.alertContainer.innerHTML = '';

        const queryParams = { ...queryState };
        // Sử dụng tên tham số đúng theo API: published_from và published_to
        if (filterDom.startDateFilter.value) {
            queryParams.published_from = filterDom.startDateFilter.value; 
        } else {
            delete queryParams.published_from;
        }
        if (filterDom.endDateFilter.value) {
            queryParams.published_to = filterDom.endDateFilter.value;
        } else {
            delete queryParams.published_to;
        }

        const result = await apiService.fetchArticles(queryParams);

        if (result && result.data && result.data.items) {
            let articlesToProcess = [...result.data.items];

            // 1. Lọc theo Tiêu đề/Nội dung (Search Input)
            const articleSearchText = filterDom.articleSearchInput.value.toLowerCase();
            if (articleSearchText && queryParams.search === undefined) { // Chỉ lọc nếu API không có tham số search
                articlesToProcess = articlesToProcess.filter(article =>
                    (article.title && article.title.toLowerCase().includes(articleSearchText)) ||
                    (article.content && article.content.toLowerCase().includes(articleSearchText))
                );
            }

            // 2. Lọc theo Nguồn (Source Filter)
            const selectedSourceId = tomSelectInstances.source.getValue();
            if (selectedSourceId && queryParams.source_id === undefined) {
                articlesToProcess = articlesToProcess.filter(article =>
                    article.source_id && String(article.source_id) === String(selectedSourceId)
                );
            }

            // 3. Lọc theo Từ khóa (Keywords)
            const selectedKeywordIds = selectedKeywords.map(kw => String(kw.id));
            if (selectedKeywordIds.length > 0 && queryParams.crawl_keyword_id === undefined) {
                articlesToProcess = articlesToProcess.filter(article => {
                    if (!article.keywords || article.keywords.length === 0) return false;
                    return article.keywords.some(kw => selectedKeywordIds.includes(String(kw.keyword_id)));
                });
            }

            // 4. Lọc theo Sắc thái (Sentiment)
            const selectedSentiment = tomSelectInstances.sentiment.getValue();
            if (selectedSentiment && queryParams.sentiment === undefined) {
                articlesToProcess = articlesToProcess.filter(article =>
                    article.sentiment && article.sentiment.toLowerCase() === selectedSentiment.toLowerCase()
                );
            }

            // 5. Lọc theo Danh mục (Category)
            if (queryState.category_id && queryParams.category_id === undefined) {
                articlesToProcess = articlesToProcess.filter(article =>
                    article.category_id && String(article.category_id) === String(queryState.category_id)
                );
            }

            // 6. Lọc theo Ngày xuất bản (Date Range) - LOẠI BỎ LỌC TRÊN FRONTEND
            // Việc lọc ngày tháng sẽ được thực hiện hoàn toàn bởi API Backend.


            // 7. Sắp xếp dữ liệu (giữ lại nếu API không đảm bảo thứ tự sắp xếp)
            const sortBy = queryState.sort_by || 'published_at';
            const sortOrder = queryState.sort_order || 'desc';

            articlesToProcess.sort((a, b) => {
                let valA, valB;

                if (sortBy === 'published_at') {
                    // Đảm bảo so sánh bằng đối tượng Date
                    valA = a.published_at ? new Date(a.published_at) : new Date(0);
                    valB = b.published_at ? new Date(b.published_at) : new Date(0);
                } else if (sortBy === 'title') {
                    // So sánh chuỗi không phân biệt hoa thường
                    valA = (a.title || '').toLowerCase();
                    valB = (b.title || '').toLowerCase();
                } else {
                    return 0; // Không sắp xếp nếu tiêu chí không hợp lệ
                }

                if (sortOrder === 'asc') { // Sắp xếp TĂNG DẦN (cũ nhất -> mới nhất, A -> Z)
                    if (valA < valB) return -1;
                    if (valA > valB) return 1;
                    return 0;
                } else { // 'desc' - Sắp xếp GIẢM DẦN (mới nhất -> cũ nhất, Z -> A)
                    if (valA > valB) return -1;
                    if (valA < valB) return 1;
                    return 0;
                }
            });
            // --- KẾT THÚC CÁC LOGIC LỌC VÀ SẮP XẾP TRÊN FRONTEND ---


            // Hiển thị các bài viết đã được lọc và sắp xếp (bởi API và có thể thêm bởi frontend)
            if (articlesToProcess.length > 0) {
                dom.articlesList.innerHTML = articlesToProcess.map(createArticleCard).join('');
                // Pagination controls giờ đây sẽ phản ánh tổng số từ API, mà API nên đã lọc.
                dom.paginationControls.innerHTML = createPagination(result.data);
            } else {
                dom.articlesList.innerHTML = `<div class="alert alert-warning text-center">Không tìm thấy bài viết nào phù hợp với các bộ lọc đã chọn.</div>`;
                dom.paginationControls.innerHTML = '';
            }
        } else {
            dom.articlesList.innerHTML = `<div class="alert alert-warning text-center">Không tìm thấy bài viết nào từ nguồn dữ liệu.</div>`;
            dom.paginationControls.innerHTML = '';
        }
    }

    async function fetchAndRenderCategories() {
        const result = await apiService.fetchCategories();
        if(result && result.data) {
            const tagsHtml = result.data.map(cat =>
                `<span class="badge tag filter-tag" data-type="category" data-id="${cat.category_id}">${cat.name}</span>`
            ).join(' ');
            filterDom.categoryFilterList.innerHTML = tagsHtml;
        }
    }

    async function fetchAndRenderSources() {
        const result = await apiService.fetchSources();
        const sourceSelect = tomSelectInstances.source;

        if (result && result.data && sourceSelect) {
            sourceSelect.clearOptions();

            const validSources = result.data.filter(source => source.source_name !== 'string');
            const sortedSources = validSources.sort((a, b) => a.source_name.localeCompare(b.source_name));

            sortedSources.forEach(source => {
                sourceSelect.addOption({
                    value: source.source_id,
                    text: source.source_name
                });
            });
        }
    }

    function renderKeywordSuggestions(keywords) {
        if (!keywords || keywords.length === 0) {
            filterDom.keywordSuggestions.style.display = 'none';
            return;
        }
        filterDom.keywordSuggestions.innerHTML = keywords.map(kw =>
            `<a href="#" class="list-group-item list-group-item-action suggestion-item" data-id="${kw.keyword_id}">${kw.keyword_text}</a>`
        ).join('');
        filterDom.keywordSuggestions.style.display = 'block';
    }

    // === CÁC HÀM QUẢN LÝ TAG TỪ KHÓA ===
    function renderSelectedKeywordTags() {
        if (selectedKeywords.length === 0) {
            filterDom.selectedKeywordContainer.innerHTML = '';
            return;
        }
        const tagsHtml = selectedKeywords.map(kw => `
            <span class="badge text-bg-primary selected-keyword-tag me-1 mb-1">
                ${kw.text}
                <button type="button" class="btn-close" aria-label="Close" data-keyword-id-to-remove="${kw.id}"></button>
            </span>
        `).join('');
        filterDom.selectedKeywordContainer.innerHTML = tagsHtml;
    }

    function addKeyword(keywordId, keywordText) {
        if (!selectedKeywords.some(kw => kw.id.toString() === keywordId.toString())) {
            selectedKeywords.push({ id: keywordId, text: keywordText });
            updateStateAndFetch();
        }
    }

    function removeKeyword(keywordId) {
        selectedKeywords = selectedKeywords.filter(kw => kw.id.toString() !== keywordId.toString());
        updateStateAndFetch();
    }

    function updateStateAndFetch() {
        const keywordIds = selectedKeywords.map(kw => kw.id);
        renderSelectedKeywordTags();
        updateQueryState({ crawl_keyword_id: keywordIds }, fetchAndRenderArticles);
    }

    // === EVENT HANDLERS ===
    const debouncedKeywordSearch = debounce(async (searchText) => {
        if (searchText.length < 2) {
            renderKeywordSuggestions([]);
            return;
        }
        const result = await apiService.fetchKeywords({ search: searchText, limit: 5 });
        if (result && result.data) {
            renderKeywordSuggestions(result.data);
        }
    }, 300);

    function addEventListeners() {
        document.body.addEventListener('click', e => {
            const tagTarget = e.target.closest('.tag');
            const pageLinkTarget = e.target.closest('a.page-link');
            const suggestionTarget = e.target.closest('.suggestion-item');
            const removeKeywordBtn = e.target.closest('.selected-keyword-tag .btn-close');
            const saveContainerTarget = e.target.closest('.save-icon-container');

            if (saveContainerTarget) {
                e.preventDefault(); // Prevent link navigation
                e.stopPropagation(); // Stop event from bubbling up to the card's link
                handleSaveToggle(saveContainerTarget);
                return; // Stop further execution
            }
            if (tagTarget) {
                e.preventDefault();
                const { type, id } = tagTarget.dataset;
                updateQueryState({ category_id: null, crawl_keyword_id: [] }, () => {
                    const updates = type === 'category' ? { category_id: id } : { crawl_keyword_id: [id] };
                    updateQueryState(updates, fetchAndRenderArticles);
                });
            }

            if (pageLinkTarget && pageLinkTarget.dataset.page) {
                e.preventDefault();
                if (pageLinkTarget.parentElement.classList.contains('disabled')) return;
                updatePageState({ page: parseInt(pageLinkTarget.dataset.page) }, fetchAndRenderArticles);
            }

            if (suggestionTarget) {
                e.preventDefault();
                const keywordId = suggestionTarget.dataset.id;
                const keywordText = suggestionTarget.textContent;
                addKeyword(keywordId, keywordText);
                filterDom.keywordSearchInput.value = '';
                filterDom.keywordSuggestions.style.display = 'none';
            }

            if (removeKeywordBtn) {
                e.preventDefault();
                const keywordIdToRemove = removeKeywordBtn.dataset.keywordIdToRemove;
                removeKeyword(keywordIdToRemove);
            }
        });

        // Gán event cho các input lọc
        filterDom.articleSearchInput.addEventListener('input', debounce(e => updateQueryState({ search: e.target.value }, fetchAndRenderArticles), 300));
        filterDom.sourceFilter.addEventListener('change', () => updateQueryState({ source_id: filterDom.sourceFilter.value }, fetchAndRenderArticles));
        filterDom.keywordSearchInput.addEventListener('input', e => debouncedKeywordSearch(e.target.value));
        filterDom.sentimentFilter.addEventListener('change', () => updateQueryState({ sentiment: filterDom.sentimentFilter.value }, fetchAndRenderArticles));

        filterDom.sortBy.addEventListener('change', () => {
            updateQueryState({ sort_by: filterDom.sortBy.value }, fetchAndRenderArticles);
        });

        filterDom.sortOrderBtn.addEventListener('click', () => {
            const newOrder = queryState.sort_order === 'desc' ? 'asc' : 'desc';
            filterDom.sortOrderBtn.innerHTML = newOrder === 'desc' ? '<i class="bi bi-sort-down"></i>' : '<i class="bi bi-sort-up"></i>';
            updateQueryState({ sort_order: newOrder }, fetchAndRenderArticles);
        });

        // Event listeners for date filters - these now directly trigger a fetch
        // API sẽ chịu trách nhiệm lọc ngày tháng hoàn toàn.
        filterDom.startDateFilter.addEventListener('change', fetchAndRenderArticles);
        filterDom.endDateFilter.addEventListener('change', fetchAndRenderArticles);

        // Cập nhật nút Reset để xóa tất cả các bộ lọc
        filterDom.resetFiltersBtn.addEventListener('click', () => {
            // 1. Reset state của API
            resetQueryState();

            // 2. Reset state UI cho các từ khóa
            selectedKeywords = [];
            renderSelectedKeywordTags();

            // 3. Reset giao diện của các ô input thường
            filterDom.articleSearchInput.value = '';
            filterDom.keywordSearchInput.value = '';
            filterDom.startDateFilter.value = '';
            filterDom.endDateFilter.value = '';

            // 4. Dùng API của TomSelect để reset các dropdown
            tomSelectInstances.source.clear();
            tomSelectInstances.sentiment.clear();
            tomSelectInstances.sortBy.setValue('published_at');
            // Đảm bảo nút sắp xếp trở về mặc định là giảm dần
            filterDom.sortOrderBtn.innerHTML = '<i class="bi bi-sort-down"></i>';

            // 5. Tải lại dữ liệu với state đã được reset
            fetchAndRenderArticles();
        });
    }

    // === INITIALIZATION ===
    async function initialize() {
        renderLayout();
        await initializeTomSelects(); // Using await just in case
        addEventListeners();

        // // === FETCH SAVED ARTICLES ON LOAD ===
        // if (getCurrentUser()) { // Only fetch if user is logged in
        //     try {
        //         const result = await apiService.getSavedArticleIds();
        //         if (result.success && Array.isArray(result.data)) {
        //             savedArticleIds = new Set(result.data);
        //         }
        //     } catch (error) {
        //         console.error("Could not fetch saved articles:", error);
        //         // Don't show an alert here, just fail silently
        //     }
        // }
        // ===================================
        
        // Now fetch articles, which will use the `savedArticleIds` set
        fetchAndRenderArticles();
        fetchAndRenderCategories();
        fetchAndRenderSources();
    }

    initialize();
});