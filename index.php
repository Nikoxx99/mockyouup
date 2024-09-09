<?php
require_once 'main.php';

// Función para generar un UUID v4
function generateUUID() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// Verificar si se proporciona un UUID en la URL
$uuid = isset($_GET['uuid']) ? $_GET['uuid'] : null;

// Si no hay UUID, generar uno nuevo y redirigir
if (!$uuid) {
    $uuid = generateUUID();
    header("Location: index.php?uuid=" . $uuid);
    exit();
}

// Obtener los datos del mockup si existe
$mockupData = getMockupData($uuid);
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor de Mockups</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://evanw.github.io/glfx.js/glfx.js"></script>
</head>
<body>
    <div id="app">
        <nav class="navbar">
            <a href="index.php" class="nav-item">Editor de Mockups</a>
            <a href="list.php" class="nav-item">Lista de Mockups</a>
        </nav>

        <div class="layout">
        <aside class="sidebar">
            <h2>Opciones</h2>
            <div class="sidebar-buttons">
                <button class="sidebar-button" id="screenImageBtn">
                    <div class="button-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <span>Subir tu logo</span>
                </button>
                <button class="sidebar-button" id="saveBtn">
                    <div class="button-icon">
                        <i class="fas fa-save"></i>
                    </div>
                    <span>Guardar</span>
                </button>
            </div>
            <div class="toggle-container">
                <span>Cambio de perspectiva</span>
                <label class="switch">
                    <input type="checkbox" id="perspectiveToggle">
                    <span class="slider round"></span>
                </label>
            </div>
            <input type="file" id="screenImage" accept="image/*" style="display: none;">
        </aside>
            <main class="main-content">
                <div class="canvas-container">
                    <img id="backgroundImage" src="<?php echo $mockupData['background_image'] ?? 'bg.jpg'; ?>" alt="Background">
                    <canvas id="canvas"></canvas>
                </div>


                <div class="product-grid">
                    <h3>Productos Disponibles</h3>
                    <div class="grid">
                        <?php for ($i = 1; $i <= 30; $i++): ?>
                            <div class="product-card">
                                <div class="product-image"></div>
                                <h4>Producto <?php echo $i; ?></h4>
                            </div>
                        <?php endfor; ?>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
    <script>
        var initialData = <?php echo json_encode($mockupData); ?>;
        var currentUUID = "<?php echo $uuid; ?>";
    </script>
    <script src="script.js"></script>
</body>
</html>