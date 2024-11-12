$(document).ready(function() {
    // Manejo del formulario de registro
    $('#register-form').submit(function(event) {
        event.preventDefault(); // Prevenir la recarga de página

        const newUser = {
            username: $('#username').val(),
            password: $('#password').val(),
            role: 'user' // Asignar un rol predeterminado
        };

        // Validar que todos los campos estén llenos
        if (!newUser.username || !newUser.password) {
            alert('Por favor completa todos los campos.');
            return;
        }

        // Enviar solicitud para crear un nuevo usuario
        $.ajax({
            url: '/register', // Cambia esto a la ruta correcta en tu backend
            type: 'POST',
            data: JSON.stringify(newUser),
            contentType: 'application/json',
            success: function(response) {
                alert('Usuario registrado exitosamente.');
                // Redirigir al usuario a la página de inicio de sesión
                window.location.href = 'login.html'; // Redirección a la página de login
            },
            error: function(response) {
                alert('Error al registrar el usuario. ' + (response.responseJSON ? response.responseJSON.message : 'Por favor intenta de nuevo.'));
            }
        });
    });
});
