// scripts.js
$(document).ready(function() {
    // Solicitud GET para obtener los personajes
    $.get('/characters.json', function(characters) {
        console.log('Personajes cargados:', characters);

        // Aquí puedes procesar los personajes y agregarlos al DOM
        characters.forEach(character => {
            const imageUrl = character.image.startsWith('http') ? character.image : `images/${character.image}`;
            $('.characters-grid').append(`
                <div class="col-md-4 character-card text-center">
                    <img src="${imageUrl}" alt="${character.name}" class="img-fluid">
                    <h3>${character.name}</h3>
                    <p>${character.description}</p>
                    <button class="btn btn-warning" data-character='${JSON.stringify(character)}' onclick="selectCharacter(this)">Seleccionar</button>
                </div>
            `);
        });
    }).fail(function(error) {
        console.error("Error al obtener personajes:", error);
    });
});
