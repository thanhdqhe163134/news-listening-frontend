// js/auth_config.js

// TODO: Thay thế bằng Google Client ID thật của bạn
const GOOGLE_CLIENT_ID = "mnp8nrt9585rd0bae52uc4kcfr8uman8";

// URL callback phải khớp với những gì đã đăng ký trên Google Cloud Console
const REDIRECT_URI_PROD = "https://thanhdqhe163134.github.io/news-listening-frontend/auth_callback.html";
const REDIRECT_URI_DEV = "http://localhost:8080/auth_callback.html";

// Tự động chọn URI dựa trên môi trường (local hay production)
const REDIRECT_URI = window.location.hostname === 'localhost' ? REDIRECT_URI_DEV : REDIRECT_URI_PROD;
