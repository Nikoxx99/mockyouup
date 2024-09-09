<?php
require_once 'main.php';
$mockups = getAllMockups();
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lista de Mockups</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="app">
        <nav class="navbar">
            <a href="index.php" class="nav-item">Editor de Mockups</a>
            <a href="list.php" class="nav-item">Lista de Mockups</a>
        </nav>

        <div class="layout">
            <main class="main-content" style="width: 100%; margin-left: 0;">
                <h2>Mockups Disponibles</h2>
                <a href="index.php" class="button">Nuevo Mockup</a>
                <div class="mockup-list">
                    <?php foreach ($mockups as $mockup): ?>
                        <div class="mockup-item" onclick="window.location.href='index.php?uuid=<?php echo $mockup['uuid']; ?>'">
                            <div class="mockup-info">
                                <strong>UUID:</strong> <?php echo substr($mockup['uuid'], 0, 8); ?>...<br>
                                <strong>Creado:</strong> <?php echo $mockup['created_at']; ?>
                            </div>
                            <img class="mockup-preview" src="<?php echo $mockup['screen_image'] ?: 'placeholder.png'; ?>" alt="Mockup Preview">
                        </div>
                    <?php endforeach; ?>
                </div>
            </main>
        </div>
    </div>
</body>
</html>