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
            migrateDatabase($db); // Llamar a la función de migración
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
        product_id INTEGER,
        selected_color TEXT,
        selected_size TEXT,
        composite_image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )');
}

function migrateDatabase($db) {
    // Verificar si las columnas nuevas existen, y si no, agregarlas
    $columns = [];
    $result = $db->query("PRAGMA table_info(mockups)");
    foreach ($result as $column) {
        $columns[] = $column['name'];
    }

    $db->beginTransaction();

    try {
        if (!in_array('zoom_level', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN zoom_level REAL");
        }
        if (!in_array('pan_x', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN pan_x REAL");
        }
        if (!in_array('pan_y', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN pan_y REAL");
        }
        // Agregar nuevas columnas para tintas, precio total, cantidad y código ZIP
        if (!in_array('inks_front', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN inks_front INTEGER");
        }
        if (!in_array('inks_back', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN inks_back INTEGER");
        }
        if (!in_array('total_price', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN total_price REAL");
        }
        if (!in_array('quantity', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN quantity INTEGER");
        }
        if (!in_array('zip_code', $columns)) {
            $db->exec("ALTER TABLE mockups ADD COLUMN zip_code TEXT");
        }

        $db->commit();
    } catch (PDOException $e) {
        $db->rollBack();
        die("Error durante la migración de la base de datos: " . $e->getMessage());
    }
}

function saveMockup($data) {
    $db = getDatabase();

    // Obtener los datos existentes del mockup
    $existingData = getMockupData($data['uuid']);

    // Utilizar los datos nuevos o existentes
    $screen_image = $data['screen_image'] ?? $existingData['screen_image'];
    $size = $data['size'] ?? $existingData['size'] ?? null;
    $position = $data['position'] ?? $existingData['position'] ?? null;
    $background_image = $data['background_image'] ?? $existingData['background_image'];
    $texts = $data['texts'] ?? $existingData['texts'];
    $product_id = $data['product_id'] ?? $existingData['product_id'];
    $selected_color = $data['selected_color'] ?? $existingData['selected_color'];
    $selected_size = $data['selected_size'] ?? $existingData['selected_size'];
    $zoom_level = $data['zoom_level'] ?? $existingData['zoom_level'];
    $pan_x = $data['pan_x'] ?? $existingData['pan_x'];
    $pan_y = $data['pan_y'] ?? $existingData['pan_y'];

    // Nuevos campos
    $inks_front = $data['inks_front'] ?? $existingData['inks_front'];
    $inks_back = $data['inks_back'] ?? $existingData['inks_back'];
    $total_price = $data['total_price'] ?? $existingData['total_price'];
    $quantity = $data['quantity'] ?? $existingData['quantity'];
    $zip_code = $data['zip_code'] ?? $existingData['zip_code'];

    // Insertar o reemplazar los datos en la tabla de mockups
    $stmt = $db->prepare('INSERT OR REPLACE INTO mockups (
        uuid, vertices, screen_image, size, position, background_image, texts, product_id, selected_color, selected_size, composite_image, zoom_level, pan_x, pan_y, inks_front, inks_back, total_price, quantity, zip_code, created_at
    ) VALUES (
        :uuid, :vertices, :screen_image, :size, :position, :background_image, :texts, :product_id, :selected_color, :selected_size, :composite_image, :zoom_level, :pan_x, :pan_y, :inks_front, :inks_back, :total_price, :quantity, :zip_code, COALESCE((SELECT created_at FROM mockups WHERE uuid = :uuid), CURRENT_TIMESTAMP)
    )');
    $stmt->execute([
        ':uuid' => $data['uuid'],
        ':vertices' => $vertices ?? null,
        ':screen_image' => $screen_image ?? null,
        ':size' => $size ?? null,
        ':position' => $position ?? null,
        ':background_image' => $background_image ?? null,
        ':texts' => $texts ?? null,
        ':product_id' => $product_id ?? null,
        ':selected_color' => $selected_color ?? null,
        ':selected_size' => $selected_size ?? null,
        ':composite_image' => $existingData['composite_image'] ?? null,
        ':zoom_level' => $zoom_level ?? null,
        ':pan_x' => $pan_x ?? null,
        ':pan_y' => $pan_y ?? null,
        ':inks_front' => $inks_front ?? null,
        ':inks_back' => $inks_back ?? null,
        ':total_price' => $total_price ?? null,
        ':quantity' => $quantity ?? null,
        ':zip_code' => $zip_code ?? null
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
            'screen_image' => null,
            'background_image' => 'bg.jpg',
            'product_id' => null,
            'isCustomBackground' => false,
            'texts' => '[]',
            'selected_color' => null,
            'selected_size' => null,
            'zoom_level' => 1,
            'pan_x' => 0,
            'pan_y' => 0,
            'inks_front' => null,
            'inks_back' => null,
            'total_price' => null,
            'quantity' => null,
            'zip_code' => null
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

        if (isset($_POST['action']) && $_POST['action'] === 'saveAdditionalData') {
            $uuid = $_POST['uuid'];

            // Obtener datos existentes
            $existingData = getMockupData($uuid);

            // Actualizar datos
            $updatedData = $existingData;

            $updatedData['inks_front'] = $_POST['inks_front'];
            $updatedData['inks_back'] = $_POST['inks_back'];
            $updatedData['total_price'] = $_POST['total_price'];
            $updatedData['quantity'] = $_POST['quantity'];
            $updatedData['zip_code'] = $_POST['zip_code'];

            $result = saveMockup($updatedData);

            if ($result) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'No se pudo guardar la información adicional']);
            }
            exit;
        }

        if (isset($_POST['action']) && $_POST['action'] === 'saveCompositeImage') {
            $uuid = $_POST['uuid'];
            $imageData = $_POST['image'];

            if (!$uuid || !$imageData) {
                throw new Exception("Faltan datos requeridos para guardar la imagen compuesta.");
            }

            // Decodificar la imagen
            $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $imageData));
            $filename = 'mockups/' . $uuid . '.png';

            // Asegurarse de que la carpeta "mockups" existe
            if (!file_exists('mockups')) {
                mkdir('mockups', 0777, true);
            }

            // Guardar la imagen en la carpeta "mockups"
            file_put_contents($filename, $imageData);

            // Actualizar la base de datos con la ruta de la imagen
            $db = getDatabase();
            $stmt = $db->prepare('UPDATE mockups SET composite_image = :composite_image WHERE uuid = :uuid');
            $stmt->execute([
                ':composite_image' => $filename,
                ':uuid' => $uuid
            ]);

            echo json_encode(['success' => true, 'image' => $filename]);
            exit;
        }

        if (!isset($data['uuid'])) {
            throw new Exception("Faltan la uuid del mockup");
        }

        // Obtener los datos existentes del mockup
        $existingData = getMockupData($data['uuid']);

        // Combinar datos existentes con los nuevos
        $updatedData = array_merge($existingData, $data);

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

        // Manejar la actualización de la imagen de pantalla
        if (isset($data['customMockupImageLoaded']) && $data['customMockupImageLoaded'] === 'false') {
            $data['screen_image'] = null;
        } else {
            if (isset($_FILES['screen_image'])) {
                $data['screen_image'] = handleFileUpload($_FILES['screen_image'], 'screen');
            } elseif (isset($_POST['screen_image']) && strpos($_POST['screen_image'], 'data:') === 0) {
                $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $_POST['screen_image']));
                $filename = uniqid('screen_') . '.png';
                $filepath = 'uploads/' . $filename;
                file_put_contents($filepath, $imageData);
                $data['screen_image'] = $filepath;
            }
        }

        $result = saveMockup($data);

        if ($result) {
            echo json_encode(['success' => true, 'custom_image' => $data['pan_x'].'-'.$data['pan_y'].'-'.$data['zoom_level']]);
        } else {
            echo json_encode(['success' => false, 'error' => 'No se pudo guardar el mockup']);
        }
    } catch (Exception $e) {
        error_log("Exception occurred: " . $e->getMessage());
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>
