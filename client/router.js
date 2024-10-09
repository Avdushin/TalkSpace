import { isAuthenticated } from './auth.js';
import { renderLogin } from './login.js';
import { renderVoiceChannel } from './client.js';

// Функция рендеринга в зависимости от состояния авторизации
function router() {
    const app = document.getElementById('app');
    if (isAuthenticated()) {
        renderVoiceChannel(app);
    } else {
        renderLogin(app);
    }
}

window.addEventListener('authChange', router);

// Запуск роутера при загрузке страницы
window.onload = router;
