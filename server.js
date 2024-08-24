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

// Modificar la configuración de Multer para manejar múltiples archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public/uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${req.body.uuid}_${file.fieldname}${ext}`);
    }
});

const upload = multer({ storage: storage });

// Conectar a la base de datos SQLite (usa un archivo para persistencia)
const db = new sqlite3.Database(path.join(__dirname, 'mockups.db')); // Cambia ':memory:' a un archivo físico

// Modificar la estructura de la tabla
db.run(`CREATE TABLE IF NOT EXISTS mockups (
    uuid TEXT PRIMARY KEY,
    vertices TEXT,
    screen_image TEXT,
    background_image TEXT,
    isCustomBackground BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Ruta para guardar la imagen y las coordenadas
app.post('/save', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'background', maxCount: 1 }
]), (req, res) => {
    const { uuid, vertices, isCustomBackground } = req.body;
    const screenImagePath = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
    const backgroundImagePath = req.files['background'] ? `/uploads/${req.files['background'][0].filename}` : null;

    if (!uuid || !vertices) {
        return res.status(400).send('UUID y vértices son requeridos.');
    }

    const verticesString = JSON.stringify(vertices);

    db.run(`INSERT INTO mockups (uuid, vertices, screen_image, background_image, isCustomBackground) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT(uuid) DO UPDATE SET 
            vertices = excluded.vertices, 
            screen_image = COALESCE(excluded.screen_image, screen_image), 
            background_image = COALESCE(excluded.background_image, background_image), 
            isCustomBackground = excluded.isCustomBackground`,
        [uuid, verticesString, screenImagePath, backgroundImagePath, isCustomBackground === 'true'],
        function (err) {
            if (err) {
                return res.status(500).send('Error al guardar los datos.');
            }
            res.send('Datos guardados correctamente.');
        }
    );
});

// Ruta para obtener los vértices y las imágenes
app.get('/get/:uuid', (req, res) => {
    const uuid = req.params.uuid;

    db.get(`SELECT vertices, screen_image, background_image, isCustomBackground FROM mockups WHERE uuid = ?`, [uuid], (err, row) => {
        if (err) {
            return res.status(500).send('Error al obtener los datos.');
        }

        if (!row) {
            return res.status(404).send('Mockup no encontrado.');
        }

        res.json({
            vertices: JSON.parse(row.vertices),
            image: row.screen_image,
            background: row.background_image,
            isCustomBackground: row.isCustomBackground
        });
    });
});

// Ruta para obtener todas las UUIDs disponibles con información adicional
app.get('/uuids', (req, res) => {
    db.all(`SELECT uuid, screen_image, background_image, datetime(created_at, 'localtime') as created_at FROM mockups ORDER BY created_at DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).send('Error al obtener los mockups.');
        }
        res.json(rows);
    });
});

// Redirigir todas las demás rutas a index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});