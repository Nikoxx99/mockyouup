const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(bodyParser.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Conectar a la base de datos SQLite (usa un archivo para persistencia)
const db = new sqlite3.Database(path.join(__dirname, 'mockups.db')); // Cambia ':memory:' a un archivo físico

// Crear la tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS mockups (
    uuid TEXT PRIMARY KEY,
    vertices TEXT
)`);

// Ruta para obtener todas las UUIDs disponibles
app.get('/uuids', (req, res) => {
    db.all(`SELECT uuid FROM mockups`, [], (err, rows) => {
        if (err) {
            return res.status(500).send('Error al obtener las UUIDs.');
        }
        const uuids = rows.map(row => row.uuid);
        res.json(uuids);
    });
});

// Guardar los vértices
app.post('/save', (req, res) => {
    const { uuid, vertices } = req.body;

    if (!uuid || !vertices) {
        return res.status(400).send('UUID y vértices son requeridos.');
    }

    const verticesString = JSON.stringify(vertices);

    db.run(`INSERT INTO mockups (uuid, vertices) VALUES (?, ?) 
            ON CONFLICT(uuid) DO UPDATE SET vertices = excluded.vertices`,
        [uuid, verticesString],
        function (err) {
            if (err) {
                return res.status(500).send('Error al guardar los vértices.');
            }
            res.send('Vértices guardados correctamente.');
        }
    );
});

// Obtener los vértices
app.get('/get/:uuid', (req, res) => {
    const uuid = req.params.uuid;

    db.get(`SELECT vertices FROM mockups WHERE uuid = ?`, [uuid], (err, row) => {
        if (err) {
            return res.status(500).send('Error al obtener los vértices.');
        }

        if (!row) {
            return res.status(404).send('Mockup no encontrado.');
        }

        res.json(JSON.parse(row.vertices));
    });
});

// Redirigir todas las demás rutas a index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
