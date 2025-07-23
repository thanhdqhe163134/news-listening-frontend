function createArticleCard(article) {
    const categoryHtml = article.category ? `<span class="badge bg-primary-subtle text-primary-emphasis me-1 tag" data-type="category" data-id="${article.category.category_id}">${article.category.name}</span>` : '';
    const keywordsHtml = (article.keywords || []).map(kw => `<span class="badge bg-secondary-subtle text-secondary-emphasis me-1 tag" data-type="keyword" data-id="${kw.keyword_id}">${kw.keyword_text}</span>`).join('');

    return `
        <div class="card article-card shadow-sm">
            <div class="card-body">
                <h5 class="card-title">${article.title}</h5>
                <p class="card-subtitle mb-2 text-muted small">
                    <strong>Nguồn:</strong> ${article.source?.source_name || 'N/A'} | 
                    <strong>Ngày:</strong> ${new Date(article.published_at).toLocaleDateString('vi-VN')}
                </p>
                <p class="card-text small">${(article.content || '').substring(0, 200)}...</p>
                <div class="d-flex justify-content-between align-items-end mt-3">
                    <div class="tags-container">${categoryHtml}${keywordsHtml}</div>
                </div>
                <a href="${article.url}" target="_blank" class="stretched-link" title="Đọc bài viết gốc"></a>
            </div>
        </div>
    `;
}