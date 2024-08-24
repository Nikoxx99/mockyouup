const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(bodyParser.json());

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de Multer para guardar las imágenes en el directorio "uploads"
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, req.body.uuid + path.extname(file.originalname)); // Usar la UUID como nombre de archivo
    }
});

const upload = multer({ storage: storage });

// Conectar a la base de datos SQLite (usa un archivo para persistencia)
const db = new sqlite3.Database(path.join(__dirname, 'mockups.db')); // Cambia ':memory:' a un archivo físico

// Crear la tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS mockups (
    uuid TEXT PRIMARY KEY,
    vertices TEXT,
    image TEXT
)`);

// Ruta para guardar la imagen y las coordenadas
app.post('/save', upload.single('image'), (req, res) => {
    const { uuid, vertices } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!uuid || !vertices) {
        return res.status(400).send('UUID y vértices son requeridos.');
    }

    const verticesString = JSON.stringify(vertices);

    db.run(`INSERT INTO mockups (uuid, vertices, image) VALUES (?, ?, ?) 
            ON CONFLICT(uuid) DO UPDATE SET vertices = excluded.vertices, image = excluded.image`,
        [uuid, verticesString, imagePath],
        function (err) {
            if (err) {
                return res.status(500).send('Error al guardar los datos.');
            }
            res.send('Datos guardados correctamente.');
        }
    );
});

// Ruta para obtener los vértices y la imagen
app.get('/get/:uuid', (req, res) => {
    const uuid = req.params.uuid;

    db.get(`SELECT vertices, image FROM mockups WHERE uuid = ?`, [uuid], (err, row) => {
        if (err) {
            return res.status(500).send('Error al obtener los datos.');
        }

        if (!row) {
            return res.status(404).send('Mockup no encontrado.');
        }

        res.json({ vertices: JSON.parse(row.vertices), image: row.image });
    });
});

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

// Redirigir todas las demás rutas a index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
