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

    // ++ STATE VARIABLES FOR NEW LOGIC ++
    let allFetchedArticles = []; // Store the big pool of 100 articles
    let isClientSidePagination = false; // Flag to check which pagination mode is active

    // =========================================================================
    // PRIORITY KEYWORD IDs
    // ID bạn cung cấp đã được cập nhật vào đây.
    // =========================================================================
    const PRIORITY_KEYWORD_IDS = [112, 113, 181, 201, 202, 208, 191];
    const ARTICLES_PER_PAGE = 10; // How many articles to show per page

    // =========================================================================

    // NEW: Fisher-Yates shuffle algorithm
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // NEW: Check if any filter is active
    function isDefaultView() {
        return !queryState.search &&
               !queryState.sentiment &&
               !queryState.category_id &&
               !queryState.source_id &&
               (!queryState.crawl_keyword_id || queryState.crawl_keyword_id.length === 0) &&
               (!filterDom.startDateFilter || !filterDom.startDateFilter.value) &&
               (!filterDom.endDateFilter || !filterDom.endDateFilter.value);
    }

    function renderLayout() {
        dom.header.innerHTML = createHeader('Article Analysis Dashboard');
        dom.mainSidebar.innerHTML = createSidebar('news');
        dom.filterSidebar.innerHTML = createFilterSidebar();
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

    // ... (Giữ nguyên các hàm: initializeTomSelects, handleSaveToggle) ...
    async function initializeTomSelects() {
        tomSelectInstances.source = new TomSelect(filterDom.sourceFilter, { placeholder: 'Chọn một nguồn...' });
        tomSelectInstances.sentiment = new TomSelect(filterDom.sentimentFilter, {});
        tomSelectInstances.sortBy = new TomSelect(filterDom.sortBy, {});
    }

    async function handleSaveToggle(saveContainer) {
        const articleId = parseInt(saveContainer.dataset.articleId, 10);
        if (!articleId) return;

        saveContainer.style.pointerEvents = 'none';
        const icon = saveContainer.querySelector('.save-icon');
        const isSaved = saveContainer.classList.contains('saved');

        try {
            if (isSaved) {
                await apiService.unsaveArticle(articleId);
                savedArticleIds.delete(articleId);
                saveContainer.classList.remove('saved');
                icon.classList.remove('bi-bookmark-fill');
                icon.classList.add('bi-bookmark');
                saveContainer.title = 'Lưu bài viết';
            } else {
                await apiService.saveArticle(articleId);
                savedArticleIds.add(articleId);
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
            saveContainer.style.pointerEvents = 'auto';
        }
    }

    // +++ REWRITTEN & FINALIZED FUNCTION +++
    async function fetchAndRenderArticles() {
        dom.articlesList.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
        dom.alertContainer.innerHTML = '';
        dom.paginationControls.innerHTML = '';

        try {
            if (isDefaultView() && PRIORITY_KEYWORD_IDS.length > 0) {
                // --- NEW CLIENT-SIDE PRIORITIZATION LOGIC ---
                isClientSidePagination = true;

                // 1. Fetch a large pool of articles
                const result = await apiService.fetchArticles({
                    ...queryState,
                    page: 1, // Always fetch the first page
                    size: 100, // Fetch 100 articles to build a diverse pool
                });

                const articlesPool = result?.data?.items || [];
                if (articlesPool.length === 0) {
                    dom.articlesList.innerHTML = `<div class="alert alert-warning text-center">Không có bài viết nào để hiển thị.</div>`;
                    return;
                }

                // 2. Separate into priority and other articles
                const priorityArticles = [];
                const otherArticles = [];
                const priorityKeywordIdsSet = new Set(PRIORITY_KEYWORD_IDS.map(String));

                articlesPool.forEach(article => {
                    const hasPriorityKeyword = article.keywords?.some(kw => priorityKeywordIdsSet.has(String(kw.keyword_id)));
                    if (hasPriorityKeyword) {
                        priorityArticles.push(article);
                    } else {
                        otherArticles.push(article);
                    }
                });

                // 3. Shuffle each group independently
                shuffleArray(priorityArticles);
                shuffleArray(otherArticles);

                // 4. Combine them, with priority articles first
                allFetchedArticles = [...priorityArticles, ...otherArticles];

                // 5. Render the first page
                renderClientSidePage(1);

            } else {
                // --- ORIGINAL SERVER-SIDE FILTERING LOGIC ---
                isClientSidePagination = false;
                allFetchedArticles = []; // Clear the pool

                const queryParams = { ...queryState };
                if (filterDom.startDateFilter.value) queryParams.published_from = filterDom.startDateFilter.value;
                if (filterDom.endDateFilter.value) queryParams.published_to = filterDom.endDateFilter.value;

                const result = await apiService.fetchArticles(queryParams);

                if (result && result.data && result.data.items && result.data.items.length > 0) {
                    dom.articlesList.innerHTML = result.data.items.map(createArticleCard).join('');
                    dom.paginationControls.innerHTML = createPagination(result.data);
                } else {
                    dom.articlesList.innerHTML = `<div class="alert alert-warning text-center">Không tìm thấy bài viết nào phù hợp với bộ lọc.</div>`;
                }
            }
        } catch (error) {
            dom.articlesList.innerHTML = `<div class="alert alert-danger text-center">Lỗi khi tải bài viết: ${error.message}</div>`;
        }
    }

    // +++ NEW HELPER FUNCTION FOR CLIENT-SIDE PAGINATION +++
    function renderClientSidePage(pageNumber) {
        const start = (pageNumber - 1) * ARTICLES_PER_PAGE;
        const end = start + ARTICLES_PER_PAGE;
        const articlesForPage = allFetchedArticles.slice(start, end);

        dom.articlesList.innerHTML = articlesForPage.map(createArticleCard).join('');

        // Create pagination data object for the createPagination function
        const paginationData = {
            page: pageNumber,
            pages: Math.ceil(allFetchedArticles.length / ARTICLES_PER_PAGE),
        };
        dom.paginationControls.innerHTML = createPagination(paginationData);
        // Update the global state so other parts of the app know the current page
        queryState.page = pageNumber;
    }


    // ... (Giữ nguyên các hàm: fetchAndRenderCategories, fetchAndRenderSources, ...) ...
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
                e.preventDefault();
                e.stopPropagation();
                handleSaveToggle(saveContainerTarget);
                return;
            }

            if (pageLinkTarget && pageLinkTarget.dataset.page) {
                e.preventDefault();
                if (pageLinkTarget.parentElement.classList.contains('disabled')) return;
                const pageNumber = parseInt(pageLinkTarget.dataset.page);

                if (isClientSidePagination) {
                    renderClientSidePage(pageNumber); // Use client-side handler
                } else {
                    updatePageState({ page: pageNumber }, fetchAndRenderArticles); // Use server-side handler
                }
                return;
            }
            
            if (tagTarget) {
                e.preventDefault();
                const { type, id } = tagTarget.dataset;
                updateQueryState({ category_id: null, crawl_keyword_id: [] }, () => {
                    const updates = type === 'category' ? { category_id: id } : { crawl_keyword_id: [id] };
                    updateQueryState(updates, fetchAndRenderArticles);
                });
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

        // Filter event listeners remain the same, they will trigger fetchAndRenderArticles
        // which will then decide the mode (client or server).
        filterDom.articleSearchInput.addEventListener('input', debounce(e => updateQueryState({ search: e.target.value }, fetchAndRenderArticles), 300));
        filterDom.sourceFilter.addEventListener('change', () => updateQueryState({ source_id: filterDom.sourceFilter.value }, fetchAndRenderArticles));
        filterDom.keywordSearchInput.addEventListener('input', e => debouncedKeywordSearch(e.target.value));
        filterDom.sentimentFilter.addEventListener('change', () => updateQueryState({ sentiment: filterDom.sentimentFilter.value }, fetchAndRenderArticles));
        filterDom.sortBy.addEventListener('change', () => updateQueryState({ sort_by: filterDom.sortBy.value }, fetchAndRenderArticles));
        filterDom.sortOrderBtn.addEventListener('click', () => {
            const newOrder = queryState.sort_order === 'desc' ? 'asc' : 'desc';
            filterDom.sortOrderBtn.innerHTML = newOrder === 'desc' ? '<i class="bi bi-sort-down"></i>' : '<i class="bi bi-sort-up"></i>';
            updateQueryState({ sort_order: newOrder }, fetchAndRenderArticles);
        });
        filterDom.startDateFilter.addEventListener('change', fetchAndRenderArticles);
        filterDom.endDateFilter.addEventListener('change', fetchAndRenderArticles);
        filterDom.resetFiltersBtn.addEventListener('click', () => {
            resetQueryState();
            selectedKeywords = [];
            renderSelectedKeywordTags();
            filterDom.articleSearchInput.value = '';
            filterDom.keywordSearchInput.value = '';
            filterDom.startDateFilter.value = '';
            filterDom.endDateFilter.value = '';
            tomSelectInstances.source.clear();
            tomSelectInstances.sentiment.clear();
            tomSelectInstances.sortBy.setValue('published_at');
            filterDom.sortOrderBtn.innerHTML = '<i class="bi bi-sort-down"></i>';
            fetchAndRenderArticles();
        });
    }

    async function initialize() {
        renderLayout();
        await initializeTomSelects();
        addEventListeners();
        fetchAndRenderArticles();
        fetchAndRenderCategories();
        fetchAndRenderSources();
    }

    initialize();
});