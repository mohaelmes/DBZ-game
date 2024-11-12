$(document).ready(() => {
    const loginForm = $("#login-form");
    const loginMessage = $("#login-message");

    loginForm.submit(async (e) => {
        e.preventDefault();

        const username = $("#username").val();
        const password = $("#password").val();

        loginMessage.text("Iniciando sesión...");

        try {
            const response = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                sessionStorage.setItem("userId", data.userId);
                sessionStorage.setItem("username", data.username);
                window.location.href = "character-selection.html";
            } else {
                loginMessage.text("Usuario o contraseña incorrectos.");
            }
        } catch (error) {
            console.error("Error de autenticación:", error);
            loginMessage.text("Hubo un error. Intenta más tarde.");
        }
    });
});
