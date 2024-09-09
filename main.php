<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);

function handleError($errno, $errstr, $errfile, $errline) {
    $error = [
        'success' => false,
        'error' => "PHP Error [$errno]: $errstr in $errfile on line $errline"
    ];
    echo json_encode($error);
    exit;
}

set_error_handler("handleError");
function getDatabase() {
    static $db = null;
    if ($db === null) {
        try {
            $db = new PDO('sqlite:mockups.db');
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            createTable($db);
        } catch (PDOException $e) {
            die("Error connecting to database: " . $e->getMessage());
        }
    }
    return $db;
}

function createTable($db) {
    $db->exec('CREATE TABLE IF NOT EXISTS mockups (
        uuid TEXT PRIMARY KEY,
        vertices TEXT,
        screen_image TEXT,
        background_image TEXT,
        size TEXT,
        position TEXT,
        texts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )');
}

function saveMockup($data) {
    $db = getDatabase();
    
    // Obtener los datos existentes del mockup
    $existingData = getMockupData($data['uuid']);
    
    // Si no se ha cargado una nueva imagen, mantener la imagen existente
    if ($data['new_image_loaded'] === 'false' && $existingData['screen_image']) {
        $data['screen_image'] = $existingData['screen_image'];
    }
    
    $stmt = $db->prepare('INSERT OR REPLACE INTO mockups (uuid, vertices, screen_image, size, position, background_image, texts) 
                          VALUES (:uuid, :vertices, :screen_image, :size, :position, :background_image, :texts)');
    $stmt->execute([
        ':uuid' => $data['uuid'],
        ':vertices' => $data['vertices'],
        ':screen_image' => $data['screen_image'],
        ':size' => $data['size'],
        ':position' => $data['position'],
        ':background_image' => $data['background_image'] ?? null,
        ':texts' => $data['texts'] ?? null
    ]);
    return $stmt->rowCount() > 0;
}


function getMockupData($uuid) {
    $db = getDatabase();
    $stmt = $db->prepare('SELECT * FROM mockups WHERE uuid = :uuid');
    $stmt->execute([':uuid' => $uuid]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$result) {
        return [
            'uuid' => $uuid,
            'vertices' => json_encode([
                ['x' => 300, 'y' => 100],
                ['x' => 700, 'y' => 100],
                ['x' => 720, 'y' => 400],
                ['x' => 280, 'y' => 400]
            ]),
            'screen_image' => null,
            'background_image' => 'bg.jpg',
            'isCustomBackground' => false,
            'texts' => '[]'
        ];
    }
    
    return $result;
}

function getAllMockups() {
    $db = getDatabase();
    $stmt = $db->query('SELECT uuid, screen_image, datetime(created_at, "localtime") as created_at 
                        FROM mockups ORDER BY created_at DESC');
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function handleFileUpload($file, $prefix) {
    if (isset($file) && $file['error'] == UPLOAD_ERR_OK) {
        $uploadDir = 'uploads/';
        if (!file_exists($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $filename = uniqid($prefix . '_') . '_' . basename($file['name']);
        $filepath = $uploadDir . $filename;
        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            return $filepath;
        }
    }
    return null;
}


if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $data = $_POST;
        
        error_log("Received POST data: " . print_r($_POST, true));
        error_log("Received FILES data: " . print_r($_FILES, true));

        if (!isset($data['uuid']) || !isset($data['vertices'])) {
            throw new Exception("Faltan datos requeridos");
        }

        // Manejar la actualización de la imagen de fondo
        if (isset($data['background_image'])) {
            if (filter_var($data['background_image'], FILTER_VALIDATE_URL)) {
                // Si es una URL válida (imagen de tarjeta de producto), la guardamos directamente
                $data['background_image'] = $data['background_image'];
            } elseif ($data['background_image'] === '/bg.jpg') {
                // Si es la imagen por defecto, guardamos null en la base de datos
                $data['background_image'] = null;
            } elseif (isset($_FILES['background_image'])) {
                // Si se subió un archivo de imagen de fondo
                $backgroundImagePath = handleFileUpload($_FILES['background_image'], 'bg');
                if ($backgroundImagePath) {
                    $data['background_image'] = $backgroundImagePath;
                }
            }
        }

        // Solo procesar la imagen si se ha cargado una nueva
        if ($data['new_image_loaded'] === 'true') {
            if (isset($_FILES['screen_image'])) {
                $data['screen_image'] = handleFileUpload($_FILES['screen_image'], 'screen');
                error_log("Handled file upload for screen_image: " . $data['screen_image']);
            } elseif (isset($_POST['screen_image']) && strpos($_POST['screen_image'], 'data:') === 0) {
                $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $_POST['screen_image']));
                $filename = uniqid('screen_') . '.png';
                $filepath = 'uploads/' . $filename;
                file_put_contents($filepath, $imageData);
                $data['screen_image'] = $filepath;
                error_log("Handled base64 data for screen_image: " . $data['screen_image']);
            }
        } else {
            error_log("No new screen_image data, keeping existing image");
        }

        $result = saveMockup($data);

        if ($result) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No se pudo guardar el mockup']);
        }
    } catch (Exception $e) {
        error_log("Exception occurred: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>