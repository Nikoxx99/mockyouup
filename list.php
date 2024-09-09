<?php
require_once 'main.php';
$mockups = getAllMockups();

// Comprobar si hay un error
$error = isset($_GET['error']) ? $_GET['error'] : null;
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lista de Mockups</title>
    <link rel="stylesheet" href="style.css">
    <style>
        body {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
        }
        .layout {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 20px;
        }
        .main-content {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
        }
        .mockup-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        .mockup-item {
            background: var(--glass-background);
            border: var(--glass-border);
            border-radius: 10px;
            overflow: hidden;
            cursor: pointer;
            transition: transform 0.3s ease;
        }
        .mockup-item:hover {
            transform: scale(1.05);
        }
        .mockup-info {
            padding: 15px;
            background: rgba(255, 87, 34, 0.1);
        }
        .mockup-preview {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        .button {
            display: inline-block;
            background: var(--primary-color);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin-bottom: 20px;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #E64A19;
        }
        .error-message {
            background-color: #ffebee;
            border: 1px solid #ef9a9a;
            color: #b71c1c;
            padding: 10px;
            margin-bottom: 20px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div id="app">
        <nav class="navbar">
            <a href="index.php" class="nav-item">Editor de Mockups</a>
            <a href="list.php" class="nav-item">Lista de Mockups</a>
        </nav>

        <div class="layout">
            <main class="main-content">
                <h2>Mockups Disponibles</h2>
                <?php if ($error): ?>
                    <div class="error-message">
                        Error: <?php echo htmlspecialchars($error); ?>
                    </div>
                <?php endif; ?>
                <a href="index.php" class="button">Nuevo Mockup</a>
                <div class="mockup-list">
                    <?php foreach ($mockups as $mockup): ?>
                        <div class="mockup-item" onclick="window.location.href='index.php?uuid=<?php echo $mockup['uuid']; ?>'">
                            <img class="mockup-preview" src="<?php echo $mockup['screen_image'] ?: 'placeholder.png'; ?>" alt="Mockup Preview">
                            <div class="mockup-info">
                                <strong>UUID:</strong> <?php echo substr($mockup['uuid'], 0, 8); ?>...<br>
                                <strong>Creado:</strong> <?php echo $mockup['created_at']; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </main>
        </div>
    </div>
</body>
</html>