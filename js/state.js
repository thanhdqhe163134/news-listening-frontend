let queryState = {
    search: '',
    sentiment: '',
    category_id: null,
    source_id: null, 
    crawl_keyword_id: [],
    sort_by: 'published_at',
    sort_order: 'desc',
    page: 1,
    size: 10
};

let savedArticleIds = new Set();
let savedProcurements = new Map();
// Cập nhật trạng thái cho bộ lọc, luôn reset về trang 1
function updateQueryState(updates, callback) {
    queryState = { ...queryState, ...updates, page: 1 };
    if (callback) callback();
}

// Cập nhật trạng thái chỉ cho phân trang
function updatePageState(updates, callback) {
     queryState = { ...queryState, ...updates };
     if (callback) callback();
}

function resetQueryState(callback) {
    queryState = {
        search: '', sentiment: '', category_id: null, source_id: null, crawl_keyword_id: [], 
        sort_by: 'published_at', sort_order: 'desc', page: 1, size: 10
    };
    if (callback) callback();
}