let socket;
let players = {};
let character;  // Guardar el personaje seleccionado
let gokuImage, vegetaImage, backgroundImg;
let myPosition;  // Posición local del jugador
let myName = "";  // Nombre del jugador

let isDayMode = true;  // Por defecto, inicia en modo Día

let nightOverlay; // Capa de oscurecimiento
// Dimensiones del canvas
const canvasWidth = 800;
const canvasHeight = 600;

function preload() {
    // Cargar las imágenes de los personajes y el fondo
    backgroundImg = loadImage('images/background.jpg');  // Correcta ruta del fondo
    gokuImage = loadImage('images/goku.png');  // Correcta ruta de la imagen de Goku
    vegetaImage = loadImage('images/vegeta.png');  // Correcta ruta de la imagen de Vegeta
}

const playersListContainer = document.getElementById("players-list");

function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = ''; // Limpiar la lista

    // Recorrer todos los jugadores y agregar su nombre y coordenadas a la lista
    Object.keys(players).forEach((playerId) => {
        const player = players[playerId];
        const playerItem = document.createElement('li');
        playerItem.textContent = `${player.name} - Coordenadas: X: ${player.x}, Y: ${player.y}`;
        playersList.appendChild(playerItem);
    });
}

function setup() {
    // Obtener el nombre del usuario desde sessionStorage
    myName = sessionStorage.getItem('userName') || 'Jugador Desconocido';
    const characterName = sessionStorage.getItem('selectedCharacterName');
   
    // Recuperar el personaje seleccionado desde localStorage usando la clave única
    const selectedCharacterData = JSON.parse(localStorage.getItem(`${myName}_${characterName}`));

    if (selectedCharacterData) {
        character = selectedCharacterData.character;  // Recuperar el personaje
        myPosition = selectedCharacterData.position;  // Recuperar la posición
    } else {
        // Si no hay datos previos, asignar una posición por defecto
        myPosition = { x: 100, y: 100 };  
    }

    console.log('Personaje y posición recuperados:', character, myPosition);

    createCanvas(800, 600).parent('#canvas-container');
    socket = io();

    socket.on('connect', () => {
        console.log('Cliente conectado');
    
        // Escuchar la lista de usuarios online
        socket.on('online-users', (onlineUsers) => {
            console.log('Usuarios online:', onlineUsers);
            // Aquí puedes actualizar la interfaz con la lista de usuarios
        });
    });
    
    // Recibir los datos del personaje al reconectarse o al refrescar la página
    socket.on('player-data', (playerData) => {
        // Asignar los datos del jugador (personaje) al estado del cliente
        updateCharacter(playerData);
    });
    
    // Establecer un intervalo para actualizar la lista de jugadores cada 5 segundos
    setInterval(() => {
        // Pedir la lista de jugadores online al servidor
        socket.emit('request-online-users');
    }, 1000);  // 5000ms = 5 segundos
    socket.on('current-players', (allPlayers) => {
        players = allPlayers;  // Asegúrate de actualizar correctamente la lista de jugadores
        updatePlayersList();  // Actualizar la lista visual de jugadores
    });

    socket.on('new-player', (data) => {
        players[data.id] = data.position;  // Añadir nuevo jugador a la lista
        updatePlayersList();  // Actualizar la lista de jugadores visualmente
    });

    socket.on('update-player', function(data) {
        // Si el jugador no está en el listado de jugadores, agregarlo
        if (!players[data.id]) {
            players[data.id] = data.position;
        } else {
            // Si ya existe el jugador, solo actualizamos sus coordenadas
            players[data.id] = data.position;
        }

        // Actualizar la lista de jugadores conectados con sus coordenadas
        updatePlayersList();
    });

    socket.on('remove-player', (id) => {
        delete players[id];  // Eliminar un jugador de la lista
        updatePlayersList();  // Actualizar la lista de jugadores visualmente
    });

    // Enviar la posición inicial del jugador al servidor
    socket.emit("move-player", { x: myPosition.x, y: myPosition.y, character: character, name: myName });
}

function draw() {
    // Verificar si el fondo y las imágenes están cargadas antes de continuar con el dibujo
    if (backgroundImg && gokuImage && vegetaImage) {
        // Dibujar el fondo
        background(backgroundImg);

        // Dibujar a todos los jugadores
        drawUsers();

        // Dibujar al jugador local
        drawUser(myPosition.x, myPosition.y, character);

        // Dibujar el borde del canvas
        stroke(255, 0, 0);  // Borde rojo
        noFill();
        rect(0, 0, canvasWidth, canvasHeight);  // Borde del canvas
    } else {
        // Si alguna de las imágenes no está cargada, mostrar un mensaje de carga
        console.log("Cargando imágenes...");
    }

    // Llamar a la función para mover al jugador mientras se mantiene presionada una tecla
    movePlayer();
}

// Función para dibujar al jugador local
function drawUser(x, y, character) {
    let characterImage;

    // Verificar el valor de character.image para seleccionar la imagen correcta
    if (character.image === "goku.png") {
        characterImage = gokuImage;
    } else if (character.image === "vegeta.png") {
        characterImage = vegetaImage;
    }

    // Dibujar el personaje del jugador local
    image(characterImage, x - 25, y - 25, 50, 50); // Ajuste de tamaño

    // Dibujar el nombre del jugador local encima de su personaje
    textAlign(CENTER, TOP);
    textSize(16);
    fill(255, 255, 255);  // Blanco
    text(myName, x, y - 40);  // Ajuste de la posición para que el nombre esté encima
}

// Función para dibujar a los demás jugadores conectados
function drawUsers() {
    for (let id in players) {
        if (id !== socket.id) {  // No dibujar al jugador local aquí
            let player = players[id];
            let characterImage;

            // Verificar el valor de player.character para seleccionar la imagen correcta
            if (player.character.image === "goku.png") {
                characterImage = gokuImage;
            } else if (player.character.image === "vegeta.png") {
                characterImage = vegetaImage;
            }

            // Dibujar el personaje del jugador
            image(characterImage, player.x - 25, player.y - 25, 50, 50);

            // Dibujar el nombre del jugador encima del personaje
            textAlign(CENTER, TOP);
            textSize(16);
            fill(255, 255, 255);  // Blanco
            text(player.name, player.x, player.y - 40);  // Ajuste de la posición para que el nombre esté encima
        }
    }
}

// Función para guardar la posición y personaje en localStorage
function savePosition(username, characterName, x, y) {
    const characterKey = `${username}_${characterName}`;
    const savedData = JSON.parse(localStorage.getItem(characterKey)) || {};

    // Actualizar la posición en el objeto guardado y guardar en localStorage
    savedData.position = { x: x, y: y };
    localStorage.setItem(characterKey, JSON.stringify(savedData));
}

// Función para recuperar la posición y personaje desde localStorage
function getSavedPosition(username, characterName) {
    const characterKey = `${username}_${characterName}`;
    const savedData = JSON.parse(localStorage.getItem(characterKey));
    return savedData && savedData.position ? savedData.position : { x: 100, y: 100 };
}

// Función de movimiento del jugador
function movePlayer() {
    const username = sessionStorage.getItem('userName');
    const character = JSON.parse(sessionStorage.getItem('selectedCharacter'));
    const characterName = character.name; // Nombre del personaje actual

    // Limitar el movimiento dentro del canvas
    if (keyIsDown(LEFT_ARROW) && myPosition.x > 0) {
        myPosition.x -= 5;
    }
    if (keyIsDown(RIGHT_ARROW) && myPosition.x < canvasWidth - 50) {
        myPosition.x += 5;
    }
    if (keyIsDown(UP_ARROW) && myPosition.y > 0) {
        myPosition.y -= 5;
    }
    if (keyIsDown(DOWN_ARROW) && myPosition.y < canvasHeight - 50) {
        myPosition.y += 5;
    }

    // Emitir la nueva posición al servidor
    socket.emit("move-player", { x: myPosition.x, y: myPosition.y, character: character, name: username });

    // Guardar la posición del jugador en localStorage
    savePosition(username, characterName, myPosition.x, myPosition.y);
}

document.addEventListener("DOMContentLoaded", function() {
    const timeSelect = document.getElementById("time-select");
    const daytimeLogo = document.getElementById("daytime-logo");

    // Función para actualizar el modo según la hora actual
    function updateTimeModeBasedOnTime() {
        const currentHour = new Date().getHours();  // Obtener la hora actual
        console.log("Hora actual: ", currentHour)
        // Si es de 00:00 a 07:00, establecer noche
        if (currentHour >= 0 && currentHour < 7) {
            isDayMode = false;  // Modo noche
            daytimeLogo.src = "images/moon.png"; // Logo de la luna
            document.querySelector(".night-overlay").style.display = "block"; // Mostrar overlay de noche
        } else {
            isDayMode = true;  // Modo día
            daytimeLogo.src = "images/sun.png"; // Logo del sol
            document.querySelector(".night-overlay").style.display = "none"; // Ocultar overlay de noche
        }
    }

    // Actualizar automáticamente el modo según la hora al cargar la página
    updateTimeModeBasedOnTime();

    // Evento para cambiar entre Día y Noche manualmente
    timeSelect.addEventListener("change", function() {
        const selectedTime = timeSelect.value;
        console.log("Hora seleccionada:", selectedTime);

        if (selectedTime === "night") {
            isDayMode = false;  // Cambiar a noche
            daytimeLogo.src = "images/moon.png";  // Cambiar logo
            document.querySelector(".night-overlay").style.display = "block";  // Mostrar overlay de noche
        } else {
            isDayMode = true;  // Cambiar a día
            daytimeLogo.src = "images/sun.png";  // Cambiar logo
            document.querySelector(".night-overlay").style.display = "none";  // Ocultar overlay de noche
        }
    });
});
