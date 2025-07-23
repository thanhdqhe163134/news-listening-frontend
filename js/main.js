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

    // DOM elements cho bộ lọc, sẽ được gán sau khi render layout
    let filterDom = {};
    
    // UI State: Lưu trữ cả ID và TEXT của các từ khóa đã chọn để dễ dàng render lại
    let selectedKeywords = []; 

    // Thư viện Tom Select sẽ được sử dụng để quản lý các dropdowns
    let tomSelectInstances = {};

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Article Analysis Dashboard');
        dom.mainSidebar.innerHTML = createSidebar('dashboard');
        dom.filterSidebar.innerHTML = createFilterSidebar();
        
        // Gán các DOM elements của bộ lọc sau khi đã render
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
        };
    }

    async function initializeTomSelects() {
        tomSelectInstances.source = new TomSelect(filterDom.sourceFilter, {
            placeholder: 'Chọn một nguồn...'
        });
        tomSelectInstances.sentiment = new TomSelect(filterDom.sentimentFilter, {});
        tomSelectInstances.sortBy = new TomSelect(filterDom.sortBy, {});
    }

    async function fetchAndRenderArticles() {
        dom.articlesList.innerHTML = `<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
        dom.alertContainer.innerHTML = '';
        const result = await apiService.fetchArticles(queryState);
        if (result && result.data && result.data.items) {
            dom.articlesList.innerHTML = result.data.items.map(createArticleCard).join('');
            dom.paginationControls.innerHTML = createPagination(result.data);
        } else {
            dom.articlesList.innerHTML = `<div class="alert alert-warning text-center">Không tìm thấy bài viết nào phù hợp.</div>`;
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
        filterDom.sortBy.addEventListener('change', () => updateQueryState({ sort_by: filterDom.sortBy.value }, fetchAndRenderArticles));
        
        filterDom.sortOrderBtn.addEventListener('click', () => {
            const newOrder = queryState.sort_order === 'desc' ? 'asc' : 'desc';
            filterDom.sortOrderBtn.innerHTML = newOrder === 'desc' ? '<i class="bi bi-sort-down"></i>' : '<i class="bi bi-sort-up"></i>';
            updateQueryState({ sort_order: newOrder }, fetchAndRenderArticles);
        });

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
            
            // 4. Dùng API của TomSelect để reset các dropdown
            tomSelectInstances.source.clear();
            tomSelectInstances.sentiment.clear();
            tomSelectInstances.sortBy.setValue('published_at'); 
            
            // 5. Tải lại dữ liệu với state đã được reset
            fetchAndRenderArticles();
        });
    }

    // === INITIALIZATION ===
    function initialize() {
        renderLayout(); 
        initializeTomSelects(); 
        addEventListeners(); 
        fetchAndRenderArticles();
        fetchAndRenderCategories();
        fetchAndRenderSources(); 
    }

    initialize();
});