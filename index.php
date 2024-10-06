<?php
include("dbconfig.php");
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

// Inicializar la conexión a la base de datos
$db = new DBConnection();
$dbcon = $db->select_database(Host, User, Password, Database);

$sql_products = "
    SELECT 
        dlp.*, 
        pc.p_cat_id, 
        pc.product_name,
        pc.p_cat_id,
        pc.image,
        pc.code
    FROM 
        design_lab_products dlp
    JOIN 
        product_category pc 
    ON 
        dlp.product_category_id = pc.p_cat_id
    LIMIT 10
";

$res_products = $db->query_execute($sql_products);

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Design Lab | Starsbranding</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://evanw.github.io/glfx.js/glfx.js"></script>
</head>
<body>
    <div id="app">
        <nav class="navbar">
            <a href="index.php" class="nav-item"><i class="fa-solid fa-list-check"></i> New Mockup</a>
            <strong class="title-maker">
                <p>Design your own T-Shirt with our custom maker</p>
            </strong>
            <div>
                <button class="nav-item-active" id="getQuoteBtn" disabled>
                    <i class="fa-regular fa-credit-card"></i> Get Quote
                </button>
                <!-- Ícono del carrito con badge -->
                <a href="/shopping_cart.php" class="nav-item">
                    <i class="fa-solid fa-shopping-cart"></i> 
                    <span id="top_cart1" class="badge">0</span>
                </a>
            </div>
        </nav>

        <div class="layout">
        <aside class="sidebar">
            <div class="logo-container">
                <img src="logo.svg" alt="Logo de la empresa" class="company-logo">
            </div>
            <div class="sidebar-buttons">
                <button class="sidebar-button" id="addTextBtn">
                    <div class="button-icon">
                        <i class="fas fa-font"></i>
                    </div>
                    <span>Add Text</span>
                </button>
                <div id="textMenu" class="text-menu">
                    <div class="text-menu-content">
                        <h3>Add Text</h3>
                        <label for="textInput">Text:</label>
                        <input type="text" id="textInput" placeholder="Write your custom text">

                        <label for="fontFamilySelectMenu">Font Family:</label>
                        <select id="fontFamilySelectMenu">
                            <option value="Arial" style="font-family: Arial;">Arial</option>
                            <option value="Helvetica" style="font-family: Helvetica;">Helvetica</option>
                            <option value="Times New Roman" style="font-family: 'Times New Roman';">Times New Roman</option>
                            <option value="Courier New" style="font-family: 'Courier New';">Courier New</option>
                            <option value="Verdana" style="font-family: Verdana;">Verdana</option>
                        </select>

                        <label for="textColorInput">Color:</label>
                        <input type="color" id="textColorInput" value="#000000">

                        <button id="addTextToCanvasBtn" class="add-text-button">Add Text</button>
                        <button id="closeTextMenuBtn" class="close-text-menu-button">Nevermind...</button>
                    </div>
                </div>
                <button class="sidebar-button" id="screenImageBtn">
                    <div class="button-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <span>Upload Logo</span>
                </button>
                <!-- Contenedor para los botones de colores -->
                <div class="sidebar-button">
                    <div class="button-icon">
                        <i class="fas fa-palette"></i>
                    </div>
                    <span>Select Color</span>
                    <div id="colorContainer" class="color-container">
                        <!-- Aquí se agregarán los botones de colores dinámicamente desde JavaScript -->
                    </div>
                    <!-- Input oculto para almacenar el color seleccionado -->
                    <input type="hidden" id="colorselect" name="colorselect" value="">
                </div>

                <!-- Control para seleccionar talla -->
                <div class="sidebar-button">
                    <div class="button-icon">
                        <i class="fas fa-ruler"></i>
                    </div>
                    <span>Select Size</span>
                    <select id="sizeselect" name="sizeselect" class="product-option">
                        <option value="">Select Size</option>
                        <!-- Aquí se agregarían las tallas dinámicamente -->
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                    </select>
                </div>
            </div>
            <div class="toggle-container">
                <span>Change Perspective</span>
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
                    <h3>Available Products</h3>
                    <div class="grid">
                        <?php
                        while ($row_product = $db->get_all_row($res_products)) {
                        ?>
                            <div class="product-card" data-image="/<?php echo $row_product['image']; ?>" data-id="<?php echo $row_product['p_cat_id']; ?>" data-image="/<?php echo $row_product['image']; ?>">
                                <div class="product-image">
                                    <img src="/<?php echo $row_product['image']; ?>" alt="<?php echo htmlspecialchars($row_product['product_name']); ?>">
                                </div>
                                <div class="product-info">
                                    <h4><?php echo htmlspecialchars($row_product['product_name']); ?></h4>
                                    <p>Código: <?php echo htmlspecialchars($row_product['code']); ?></p>
                                </div>
                            </div>
                        <?php
                        }
                        ?>
                    </div>
                </div>
            </main>
        </div>
    </div>
    <span id="top_cart" class="badge">0</span>
    <span id="total_cart_value" class="badge">0</span>
    <div id="cartToast" class="toast" style="position: fixed; bottom: 20px; right: 20px; background-color: #4caf50; color: white; padding: 15px; border-radius: 5px; display: none;">
        Producto agregado al carrito.
    </div>
    <script src="script.js"></script>
    <script src="../js/cart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
    <script>
        var initialData = <?php echo json_encode($mockupData); ?>;
        var currentUUID = "<?php echo $uuid; ?>";
        var rand = currentUUID;
    </script>
    <script>

        // Iniciar el contador del carrito (puedes inicializarlo dinámicamente si tienes datos en sesión)
        document.addEventListener("DOMContentLoaded", function() {
            // Suponiendo que obtienes el conteo del carrito desde una variable de sesión o backend
            var initialCartCount = <?php echo isset($_SESSION['shopping_cart_qty']) ? count($_SESSION['shopping_cart_qty'][$_GET['p_cat_id']]) : 0; ?>;
            document.getElementById('top_cart1').innerText = initialCartCount;
        });
        </script>
</body>
</html>