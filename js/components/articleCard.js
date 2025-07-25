/**
 * Creates the HTML for a sentiment indicator dot.
 * @param {string} sentiment - The sentiment value ('positive', 'negative', 'neutral').
 * @returns {string} The HTML string for the indicator.
 */
function createSentimentIndicator(sentiment) {
    // If no sentiment is provided, return an empty string
    if (!sentiment) return '';

    let sentimentClass = '';
    let sentimentTooltip = '';

    // Determine the class and tooltip text based on the sentiment value
    switch (sentiment.toLowerCase()) {
        case 'positive':
            sentimentClass = 'sentiment-positive';
            sentimentTooltip = 'Sắc thái: Tích cực';
            break;
        case 'negative':
            sentimentClass = 'sentiment-negative';
            sentimentTooltip = 'Sắc thái: Tiêu cực';
            break;
        case 'neutral':
            sentimentClass = 'sentiment-neutral';
            sentimentTooltip = 'Sắc thái: Trung tính';
            break;
        default:
            // Don't render anything for an unknown sentiment
            return '';
    }

    // Return the HTML for the indicator
    return `<div class="sentiment-indicator ${sentimentClass}" title="${sentimentTooltip}"></div>`;
}


function createArticleCard(article) {
    const categoryHtml = article.category ? `<span class="badge bg-primary-subtle text-primary-emphasis me-1 tag" data-type="category" data-id="${article.category.category_id}">${article.category.name}</span>` : '';
    const keywordsHtml = (article.keywords || []).map(kw => `<span class="badge bg-secondary-subtle text-secondary-emphasis me-1 tag" data-type="keyword" data-id="${kw.keyword_id}">${kw.keyword_text}</span>`).join('');
    
    // Create the sentiment indicator HTML
    const sentimentIndicatorHtml = createSentimentIndicator(article.sentiment);

    // Format published_at and crawl_date
    const publishedDate = article.published_at ? new Date(article.published_at) : null;
    const crawlDate = article.crawl_date ? new Date(article.crawl_date) : null;

    const publishedDateString = publishedDate ? publishedDate.toLocaleDateString('vi-VN') : 'N/A';
    const crawlDateString = crawlDate ? crawlDate.toLocaleDateString('vi-VN') : 'N/A';

    // Determine if it's "new news"
    let newNewsIndicatorHtml = '';
    // Giả sử "gần với" là cùng ngày.
    if (publishedDate && crawlDate && publishedDate.toDateString() === crawlDate.toDateString()) {
        newNewsIndicatorHtml = '<div class="new-news-indicator"><span>Tin mới</span></div>'; // Thêm chữ "Tin mới" vào đây
    }

    return `
        <div class="card article-card shadow-sm position-relative">
            ${newNewsIndicatorHtml} ${sentimentIndicatorHtml}
            <div class="card-body">
                <h5 class="card-title">${article.title}</h5>
                <p class="card-subtitle mb-2 text-muted small">
                    <strong>Nguồn:</strong> ${article.source?.source_name || 'N/A'} | 
                    <strong>Ngày xuất bản:</strong> ${publishedDateString} |
                    <strong>Ngày cập nhật:</strong> ${crawlDateString}
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