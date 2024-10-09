let token: string | null = localStorage.getItem('token');

// Проверка, авторизован ли пользователь
export function isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token; // Проверяем, что токен существует
}


// Получение токена
export function getToken(): string | null {
    return token;
}

// Функция для авторизации пользователя
export async function login(username: string, password: string): Promise<void> {
    return fetch('http://127.0.0.1:8080/login', {  // Укажите правильный URL к серверу
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    })
    .then(response => {
        if (response.ok) {
            return response.text();  // Получаем JWT токен как строку
        } else {
            throw new Error('Login failed');
        }
    })
    .then(jwt => {
        token = jwt;  // Сохраняем токен в переменной
        localStorage.setItem('token', token);  // Сохраняем токен в localStorage
        dispatchAuthChangeEvent();  // Генерируем событие изменения авторизации
    })
    .catch(error => {
        console.error("Login error:", error);
        throw error;  // Пробрасываем ошибку выше
    });
}

// Функция для выхода из аккаунта (очистка токена)
export function logout(): void {
    token = null;
    localStorage.removeItem('token');
    dispatchAuthChangeEvent();  // Генерируем событие изменения авторизации
}

// Генерация события изменения авторизации
function dispatchAuthChangeEvent(): void {
    const event = new Event('authChange');
    window.dispatchEvent(event);
}
