const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const fs = require("fs");
const path = require("path");

const bodyParser = require('body-parser');
const app = express();

const server = http.createServer(app);
const io = socketIO(server);
let onlineUsers = [];


// Sirve archivos estáticos desde la carpeta 'public'
app.use(express.static('public'));

const usersPath = path.join(__dirname, 'users.json');  // Definir la ruta del archivo users.json

app.use(express.json()); // Para manejar el cuerpo de las peticiones en formato JSON

const PORT = process.env.PORT || 3000;

// Cargar los usuarios y personajes desde los archivos JSON
const users = JSON.parse(fs.readFileSync("users.json", "utf-8"));
const characters = JSON.parse(fs.readFileSync("characters.json", "utf-8"));
// Middleware para parsear el cuerpo de las solicitudes POST
app.use(bodyParser.json());

// Endpoint para autenticar al usuario
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    console.log("req.body es ", req.body)
    // Buscar al usuario en el array de usuarios
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        console.log("Usuario encontrado:", user);
        
        // Agregar el usuario a la lista de usuarios conectados
        const userOnline = { id: user.id, name: user.username };
        if (!onlineUsers.some(u => u.id === user.id)) {
            onlineUsers.push(userOnline);
            console.log("online users", onlineUsers)
        }
        
        res.json({ success: true, userId: user.id, username: user.username });
    } else {
        res.status(401).json({ success: false, message: "Usuario o contraseña incorrectos" });
    }
});



// Ruta para manejar el registro de nuevos usuarios
app.post("/register", (req, res) => {
    const { username, password } = req.body;

    // Ruta del archivo users.json
    const usersPath = path.join(__dirname, 'users.json');

    // Leer el archivo users.json
    fs.readFile(usersPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error al leer el archivo:", err);
            return res.status(500).send({ message: 'Error al leer el archivo de usuarios' });
        }

        let users = [];
        if (data) {
            users = JSON.parse(data); // Convertir el archivo JSON a un array de usuarios
        }

        // Verificar si el usuario ya existe
        const userExists = users.some(user => user.username === username);
        if (userExists) {
            return res.status(400).send({ success: false, message: 'El nombre de usuario ya está en uso' });
        }

        // Crear un nuevo usuario con un ID único
        const newUser = {
            id: users.length + 1,  // Asignar un ID único (podrías usar una lógica diferente si prefieres)
            username: username,
            password: password,
            role: 'user' // Asignar un rol predeterminado de usuario
        };

        // Agregar el nuevo usuario al arreglo de usuarios
        users.push(newUser);

        // Escribir los usuarios actualizados en el archivo users.json
        fs.writeFile(usersPath, JSON.stringify(users, null, 2), 'utf8', (err) => {
            if (err) {
                console.error("Error al guardar el usuario:", err);
                return res.status(500).send({ message: 'Error al guardar el usuario' });
            }
            res.send({ success: true, message: 'Usuario registrado con éxito' });
        });
    });
});

// Endpoint para obtener personajes específicos de un usuario
app.get("/characters/:userId", (req, res) => {
    const userId = parseInt(req.params.userId);
    const userCharacters = characters.filter(char => char.userId === userId); // Filtrar personajes
    res.json(userCharacters); // Enviar solo personajes del usuario
});
    

const updateOnlineUsersInterval = 1000; // 1 segundo

// Función para actualizar y emitir la lista de usuarios online
const updateOnlineUsers = () => {
    io.emit("online-users", onlineUsers);  // Emitir la lista a todos los clientes
};

// Configurar el intervalo para actualizar la lista de usuarios online
setInterval(updateOnlineUsers, updateOnlineUsersInterval);
// Mantener un registro de las posiciones de los jugadores
let players = {};

// Configuración de Socket.IO para el manejo del juego
io.on("connection", (socket) => {
    console.log("Nuevo cliente conectado");

     // Aquí puedes agregar lógica para cuando un usuario se conecte y se registre
     socket.on("login", (user) => {
        // Crear un objeto con el ID del usuario y el socketId
        const userOnline = { id: user.id, name: user.username, socketId: socket.id };
    
        // Si el usuario no está ya en la lista, lo agregamos
        if (!onlineUsers.some(u => u.id === user.id)) {
            onlineUsers.push(userOnline);
        }
    
        console.log("Nuevo usuario conectado:", user);
        console.log("Usuarios online:", onlineUsers);
    
        // Emitir la lista actualizada de usuarios online
        io.emit('online-users', onlineUsers);

         // Emitir las coordenadas actuales de todos los jugadores al nuevo jugador
         socket.emit('update-player', players);
    });
   

  
    // Cuando un jugador se mueve
    socket.on('move-player', (data) => {
        // Actualizar la posición del jugador en el servidor
        players[socket.id] = { x: data.x, y: data.y, character: data.character, name: data.name };
        
        // Emitir la nueva lista de jugadores a todos los demás jugadores
        io.emit('update-player', { id: socket.id, position: players[socket.id] });
    });

 // Evento para manejar desconexiones
 socket.on("disconnect", () => {
    console.log("Cliente desconectado", socket.id);

    // Eliminar el usuario de la lista de onlineUsers
    onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);

    // Emitir la lista actualizada de usuarios online
    io.emit("online-users", onlineUsers);

    console.log("Usuarios online después de desconectar:", onlineUsers);
});


    
    socket.on("logout", (userId) => {
        console.log(`Usuario ${userId} ha cerrado sesión`);

        // Eliminar al usuario de la lista de onlineUsers
        onlineUsers = onlineUsers.filter(u => u.id !== userId);

        // Emitir la lista actualizada de usuarios online
        io.emit('online-users', onlineUsers);
    });
    

   
    

    
});

server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


app.get('/characters.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'characters.json')); // Ruta completa al archivo
});
// Si users.json está en la carpeta raíz, puedes configurarlo así:
app.get('/users.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'users.json'));
});

app.post("/api/characters", (req, res) => {
    const { name, description, image, userId } = req.body;  // Extraer los datos
    console.log("este es el req body", req.body)
    // Validar que todos los campos obligatorios estén presentes
    if (!name || !description || !image || !userId) {
        return res.status(400).send({ 
            success: false, 
            message: 'Faltan datos obligatorios para crear el personaje'
        });
    }

    // Asignar un ID único basándose en la longitud actual de los personajes
    const newId = characters.length > 0 ? Math.max(...characters.map(char => char.id)) + 1 : 1;

    // Crear el nuevo personaje con el ID asignado
    const newCharacter = { id: newId, name, description, image, userId };

    // Agregar el nuevo personaje al array de personajes
    characters.push(newCharacter);

    // Guardar el arreglo de personajes actualizado en el archivo 'characters.json'
    fs.writeFile(path.join(__dirname, 'characters.json'), JSON.stringify(characters, null, 2), (err) => {
        if (err) {
            console.error("Error al guardar el personaje:", err);
            return res.status(500).send({ 
                success: false, 
                message: 'Error al guardar el personaje' 
            });
        }

        // Responder con la lista de personajes actualizada
        res.status(201).send({ 
            success: true, 
            message: 'Personaje creado con éxito', 
            character: newCharacter
        });
    });
});




// Editar un personaje
app.put("/characters/:id", (req, res) => {
    const characterId = parseInt(req.params.id);
    const { name, description, image, userId } = req.body;

    // Buscar el índice del personaje y verificar `userId`
    const characterIndex = characters.findIndex(char => char.id === characterId && char.userId === userId);
    if (characterIndex === -1) {
        return res.status(404).send({ success: false, message: 'Personaje no encontrado o no autorizado' });
    }

    // Actualizar personaje
    characters[characterIndex] = { ...characters[characterIndex], name, description, image };

    fs.writeFile(path.join(__dirname, 'characters.json'), JSON.stringify(characters, null, 2), (err) => {
        if (err) {
            console.error("Error al actualizar personaje:", err);
            return res.status(500).send({ message: 'Error al actualizar el personaje' });
        }
        res.send({ success: true, message: 'Personaje actualizado con éxito' });
    });
});



app.get('/api/users', (req, res) => {
    // Ruta del archivo users.json
    const filePath = path.join(__dirname, 'users.json');

    // Leer el archivo users.json y enviarlo como respuesta
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            res.status(500).json({ error: 'Error al leer el archivo de usuarios' });
            return;
        }

        // Parsear el contenido del archivo JSON y enviarlo
        const users = JSON.parse(data);
        res.json(users);
    });
});

app.get('/api/characters', (req, res) => {
    // Leer el archivo 'characters.json'
    fs.readFile(path.join(__dirname, 'characters.json'), 'utf8', (err, data) => {
        if (err) {
            // Si hay un error al leer el archivo, responder con un error 500
            console.error('Error al leer el archivo de personajes:', err);
            return res.status(500).json({
                success: false,
                message: 'Error al leer el archivo de personajes'
            });
        }

        // Parsear el archivo JSON y devolverlo en la respuesta
        const characters = JSON.parse(data);
        res.status(200).json({
            success: true,
            message: 'Lista de personajes obtenida correctamente',
            characters: characters
        });
    });
});



// Endpoint GET: Obtener un personaje por ID
app.get('/api/characters/:id', (req, res) => {
    const character = characters.find(c => c.id === parseInt(req.params.id));
    if (character) {
        res.json(character);
    } else {
        res.status(404).json({ message: 'Personaje no encontrado' });
    }
});


// Ruta para crear un personaje
app.post('/api/characters', (req, res) => {
    const { name, description, image, userId } = req.body;  // Tomamos los datos del nuevo personaje

    if (!name || !description || !image || !userId) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Leer el archivo characters.json
    fs.readFile(path.join(__dirname, 'characters.json'), 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error al leer el archivo' });
        }

        const characters = JSON.parse(data);
        const newCharacter = {
            id: characters.length + 1,  // Generamos un nuevo ID, puede ser mejorado (por ejemplo, usando UUID)
            name,
            description,
            image,
            userId
        };

        // Agregar el nuevo personaje al arreglo
        characters.push(newCharacter);

        // Guardar el archivo actualizado
        fs.writeFile(path.join(__dirname, 'characters.json'), JSON.stringify(characters, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error al guardar el archivo' });
            }
            res.status(201).json(newCharacter);  // Respondemos con el personaje creado
        });
    });
});



app.put('/api/characters/:id', (req, res) => {
    const characterId = parseInt(req.params.id);  // Obtener el ID del personaje desde la URL
    const { name, description, image, userId } = req.body;

    // Validar que todos los campos estén presentes
    if (!name || !description || !image || !userId) {
        return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    // Leer el archivo characters.json
    fs.readFile(path.join(__dirname, 'characters.json'), 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error al leer el archivo' });
        }

        const characters = JSON.parse(data);

        // Buscar el personaje con el ID dado
        const characterIndex = characters.findIndex(c => c.id === characterId);

        if (characterIndex === -1) {
            return res.status(404).json({ message: 'Personaje no encontrado' });
        }

        // Actualizar los valores del personaje encontrado
        const updatedCharacter = {
            ...characters[characterIndex], // Mantener los valores actuales
            name,
            description,
            image,
            userId
        };

        // Reemplazar el personaje con los nuevos datos
        characters[characterIndex] = updatedCharacter;

        // Guardar el archivo actualizado
        fs.writeFile(path.join(__dirname, 'characters.json'), JSON.stringify(characters, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Error al guardar el archivo' });
            }
            res.status(200).json(updatedCharacter);  // Responder con el personaje actualizado
        });
    });
});


// Ruta para eliminar un personaje
app.delete('/api/characters/:id', (req, res) => {
    const characterId = parseInt(req.params.id); // Obtener el ID del personaje desde la URL

    // Leer el archivo characters.json
    fs.readFile(path.join(__dirname, 'characters.json'), 'utf-8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error al leer el archivo' });
        }

        // Parseamos los datos del archivo JSON
        const characters = JSON.parse(data);

        // Encontrar el índice del personaje a eliminar
        const characterIndex = characters.findIndex(c => c.id === characterId);

        if (characterIndex !== -1) {
            // Si el personaje existe, lo eliminamos
            characters.splice(characterIndex, 1);

            // Escribir los cambios nuevamente en el archivo
            fs.writeFile(path.join(__dirname, 'characters.json'), JSON.stringify(characters, null, 2), (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error al guardar los cambios en el archivo' });
                }
                res.status(200).json({ message: 'Personaje eliminado con éxito' });
            });
        } else {
            // Si no encontramos el personaje
            res.status(404).json({ message: 'Personaje no encontrado' });
        }
    });
});


app.get('/api/online-users', (req, res) => {
    // Enviar solo la lista de usuarios online sin un objeto adicional
    res.status(200).json(onlineUsers);  // Aquí directamente pasamos el arreglo
});

