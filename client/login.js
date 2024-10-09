import { login } from './auth.js';

export function renderLogin(container) {
    container.innerHTML = `
        <h2>Login</h2>
        <form id="loginForm">
            <label for="username">Username:</label>
            <input type="text" id="username" required>
            <label for="password">Password:</label>
            <input type="password" id="password" required>
            <button type="submit">Login</button>
        </form>
        <p id="errorMessage" style="color: red;"></p>
    `;

    const form = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = form.username.value;
        const password = form.password.value;

        login(username, password)
            .then(() => {
                console.log("Successfully logged in");
            })
            .catch(error => {
                console.error("Login failed", error);
                errorMessage.textContent = "Invalid credentials. Please try again.";
            });
    });
}
