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
    image TEXT,
    background TEXT,
    isCustomBackground BOOLEAN
)`);

// Ruta para guardar la imagen y las coordenadas
app.post('/save', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'background', maxCount: 1 }
]), (req, res) => {
    const { uuid, vertices, isCustomBackground } = req.body;
    const imagePath = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
    const backgroundPath = req.files['background'] ? `/uploads/${req.files['background'][0].filename}` : null;

    if (!uuid || !vertices) {
        return res.status(400).send('UUID y vértices son requeridos.');
    }

    const verticesString = JSON.stringify(vertices);

    db.run(`INSERT INTO mockups (uuid, vertices, image, background, isCustomBackground) 
            VALUES (?, ?, ?, ?, ?) 
            ON CONFLICT(uuid) DO UPDATE SET 
            vertices = excluded.vertices, 
            image = excluded.image, 
            background = excluded.background, 
            isCustomBackground = excluded.isCustomBackground`,
        [uuid, verticesString, imagePath, backgroundPath, isCustomBackground === 'true'],
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

    db.get(`SELECT vertices, image, background, isCustomBackground FROM mockups WHERE uuid = ?`, [uuid], (err, row) => {
        if (err) {
            return res.status(500).send('Error al obtener los datos.');
        }

        if (!row) {
            return res.status(404).send('Mockup no encontrado.');
        }

        res.json({
            vertices: JSON.parse(row.vertices),
            image: row.image,
            background: row.background,
            isCustomBackground: row.isCustomBackground
        });
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