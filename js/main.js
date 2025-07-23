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

    // Các element của bộ lọc, sẽ được truy cập sau khi render
    let filterDom = {};

    // === RENDER FUNCTIONS ===
    function renderLayout() {
        dom.header.innerHTML = createHeader('Article Analysis Dashboard');
        dom.mainSidebar.innerHTML = createSidebar('dashboard');
        dom.filterSidebar.innerHTML = createFilterSidebar();
        
        // Sau khi render, lấy các element của bộ lọc
        filterDom = {
            articleSearchInput: document.getElementById('article-search-input'),
            keywordSearchInput: document.getElementById('keyword-search-input'),
            keywordSuggestions: document.getElementById('keyword-suggestions'),
            sentimentFilter: document.getElementById('sentiment-filter'),
            sortBy: document.getElementById('sort-by'),
            sortOrderBtn: document.getElementById('sort-order-btn'),
            resetFiltersBtn: document.getElementById('reset-filters-btn'),
            categoryFilterList: document.getElementById('category-filter-list'),
        };
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
        // Lắng nghe sự kiện trên toàn bộ body để xử lý các element động
        document.body.addEventListener('click', e => {
            const tagTarget = e.target.closest('.tag');
            const pageLinkTarget = e.target.closest('a.page-link');
            const suggestionTarget = e.target.closest('.suggestion-item');
            
            if (tagTarget) {
                e.preventDefault();
                const { type, id } = tagTarget.dataset;
                updateQueryState({ category_id: null, crawl_keyword_id: null }, () => {
                     const updates = type === 'category' ? { category_id: id } : { crawl_keyword_id: id };
                     updateQueryState(updates, fetchAndRenderArticles);
                });
            }

            if (pageLinkTarget && pageLinkTarget.dataset.page) {
                e.preventDefault();
                if (pageLinkTarget.parentElement.classList.contains('disabled')) return;
                updatePageState({ page: parseInt(pageLinkTarget.dataset.page) }, fetchAndRenderArticles);
            }
            
            if(suggestionTarget) {
                e.preventDefault();
                const keywordId = suggestionTarget.dataset.id;
                const keywordText = suggestionTarget.textContent;
                filterDom.keywordSearchInput.value = keywordText;
                filterDom.keywordSuggestions.style.display = 'none';
                updateQueryState({ crawl_keyword_id: keywordId, category_id: null }, fetchAndRenderArticles);
            }
        });
        
        // Các event listener cho bộ lọc
        filterDom.articleSearchInput.addEventListener('input', debounce(e => updateQueryState({ search: e.target.value }, fetchAndRenderArticles)));
        filterDom.keywordSearchInput.addEventListener('input', e => debouncedKeywordSearch(e.target.value));
        filterDom.sentimentFilter.addEventListener('change', () => updateQueryState({ sentiment: filterDom.sentimentFilter.value }, fetchAndRenderArticles));
        filterDom.sortBy.addEventListener('change', () => updateQueryState({ sort_by: filterDom.sortBy.value }, fetchAndRenderArticles));
        
        filterDom.sortOrderBtn.addEventListener('click', () => {
            const newOrder = queryState.sort_order === 'desc' ? 'asc' : 'desc';
            filterDom.sortOrderBtn.innerHTML = newOrder === 'desc' ? '<i class="bi bi-sort-down"></i>' : '<i class="bi bi-sort-up"></i>';
            updateQueryState({ sort_order: newOrder }, fetchAndRenderArticles);
        });

        filterDom.resetFiltersBtn.addEventListener('click', () => {
            resetQueryState(fetchAndRenderArticles);
            // Reset UI
            filterDom.articleSearchInput.value = '';
            filterDom.keywordSearchInput.value = '';
            filterDom.sentimentFilter.value = '';
            filterDom.sortBy.value = 'published_at';
        });
    }

    // === INITIALIZATION ===
    function initialize() {
        renderLayout();
        addEventListeners();
        fetchAndRenderArticles();
        fetchAndRenderCategories();
    }

    initialize();
});