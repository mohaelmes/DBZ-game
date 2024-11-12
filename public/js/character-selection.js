$(document).ready(async () => {
    const userId = sessionStorage.getItem("userId");

    // Si el usuario no está logueado, redirigir al login
    if (!userId) {
        window.location.href = "login.html";
    } else {
        try {
            // Obtener personajes del servidor
            const response = await fetch(`/characters/${userId}`);
            const characters = await response.json();

            // Iterar sobre los personajes y agregarlos al HTML
            characters.forEach((character) => {
                const characterCard = `
                    <div class="character-card">
                        <img src="${character.image}" alt="${character.name}" class="character-image">
                        <h3>${character.name}</h3>
                        <p>${character.description}</p>
                        <button onclick="selectCharacter('${character.name}')">Seleccionar</button>
                    </div>
                `;
                // Agregar el personaje a la lista en el DOM
                $("#character-list").append(characterCard);
            });
        } catch (error) {
            console.error("Error al cargar personajes:", error);
        }
    }
});

