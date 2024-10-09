let token = null;

export function isAuthenticated() {
    return token !== null || localStorage.getItem('token') !== null;
}

export function login(username, password) {
    return fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (response.ok) {
            return response.text();  // Получаем JWT токен
        } else {
            throw new Error('Login failed');
        }
    })
    .then(jwt => {
        token = jwt;
        localStorage.setItem('token', token);  // Сохраняем токен в localStorage
        dispatchAuthChangeEvent();  // Генерируем событие изменения авторизации
    });
}

export function logout() {
    token = null;
    localStorage.removeItem('token');
    dispatchAuthChangeEvent();  // Генерируем событие изменения авторизации
}

export function getToken() {
    return token || localStorage.getItem('token');
}

function dispatchAuthChangeEvent() {
    const event = new Event('authChange');
    window.dispatchEvent(event);
}
