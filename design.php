<?php
// design.php

// Incluir la configuración y funciones necesarias
require_once 'main.php';

// Obtener el UUID del mockup desde el parámetro GET y validarlo
if (isset($_GET['uuid']) && !empty($_GET['uuid'])) {
    $uuid = $_GET['uuid'];
} else {
    die('No se proporcionó un UUID válido.');
}

// Función para obtener los datos del mockup desde la base de datos
function getMockupByUUID($uuid) {
    $db = getDatabase();
    $stmt = $db->prepare('SELECT * FROM mockups WHERE uuid = :uuid');
    $stmt->execute([':uuid' => $uuid]);
    $mockup = $stmt->fetch(PDO::FETCH_ASSOC);
    return $mockup;
}

// Obtener los datos del mockup
$mockupData = getMockupByUUID($uuid);

if (!$mockupData) {
    die('No se encontró un mockup con el UUID proporcionado.');
}

// Obtener la ruta de la imagen compuesta y el logo del cliente
$compositeImagePath = $mockupData['composite_image'];
$clientLogoPath = $mockupData['screen_image']; // Asumiendo que 'screen_image' es el logo subido por el cliente

// Obtener información adicional del mockup
$creationDate = $mockupData['created_at'];
$uuid = $mockupData['uuid'];

// Verificar si los archivos existen
if (!file_exists($compositeImagePath)) {
    $compositeImagePath = 'placeholder_composite.png'; // Imagen de marcador de posición
}

if (!file_exists($clientLogoPath)) {
    $clientLogoPath = 'placeholder_logo.png'; // Imagen de marcador de posición
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Detalle del Mockup</title>
    <link rel="stylesheet" href="design.css">
    <!-- Puedes incluir aquí enlaces a fuentes, iconos o frameworks CSS si lo deseas -->
</head>
<body>
    <!-- Encabezado con el logo de la empresa -->
    <header class="header">
        <div class="logo-container">
            <img src="../images/Logo StarsBranding 2024.svg" alt="Starsbranding">
          </div>
          <h3>Mockup details - Design Lab</h3>
    </header>

    <!-- Contenedor principal con padding -->
    <div class="container">
        <!-- Caja que contiene la imagen del mockup -->
        <div class="mockup-box">
            <img src="<?php echo htmlspecialchars($compositeImagePath); ?>" alt="Mockup">
        </div>

        <!-- Sección inferior con el logo y la información del mockup en cajas -->
        <div class="bottom-section">
            <!-- Caja con el logo del cliente -->
            <div class="box logo-section">
                <h2>Upload resource</h2>
                <img src="<?php echo htmlspecialchars($clientLogoPath); ?>" alt="Logo del Cliente">
            </div>
            <!-- Caja con el botón de descarga y la información del mockup -->
            <div class="box info-section">
                <button class="download-button" onclick="downloadResource('<?php echo htmlspecialchars($clientLogoPath); ?>')">
                    Download Resource
                </button>
                <div class="mockup-info">
                    <h2>Mockup information</h2>
                    <p><strong>UUID:</strong> <?php echo htmlspecialchars($uuid); ?></p>
                    <p><strong>Creation date:</strong> <?php echo htmlspecialchars($creationDate); ?></p>
                    <!-- Puedes agregar más información aquí -->
                </div>
            </div>
        </div>
    </div>

    <!-- Script para manejar la descarga del recurso -->
    <script>
        function downloadResource(filePath) {
            window.location.href = filePath;
        }
    </script>
</body>
</html>
