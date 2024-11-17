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
$p_cat_id = isset($_GET['p_cat_id']) ? $_GET['p_cat_id'] : '2532';
$default_image = '/media/product_image/g200_38_z.jpg';

// Si no hay UUID, generar uno nuevo y redirigir
if (!$uuid) {
    $uuid = generateUUID();
    header("Location: index.php?uuid=" . $uuid."&p_cat_id=".$p_cat_id);
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
        pc.cost_price,
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
            <a href="https://starsbranding.com">
                <div class="logo-container">
                    <img src="logo.svg" alt="Logo de la empresa" class="company-logo">
                </div>
            </a>
            <strong class="title-maker">
                <p>Design your own T-Shirt with our custom maker</p>
            </strong>
            <div>
                <a href="index.php" class="nav-item"><i class="fa-solid fa-list-check"></i> New Mockup</a>
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
                <div class="sidebar-buttons">
                    <button class="sidebar-button" id="addTextBtn">
                        <div class="button-icon">
                            <i class="fas fa-font"></i>
                        </div>
                        <span>Add Text</span>
                    </button>
                    <button class="sidebar-button" id="screenImageBtn">
                        <div class="button-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <span>Upload Logo</span>
                    </button>
                    <button class="sidebar-button" id="selectColorBtn">
                        <div class="button-icon">
                            <i class="fas fa-palette"></i>
                        </div>
                        <span>Select Color</span>
                        <div id="colorPreview" style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; margin-left: 0px; background-color: #ffffff;"></div>
                    </button>
                    <div class="sidebar-button">
                        <div class="button-icon">
                            <i class="fas fa-ruler"></i>
                        </div>
                        <span>Select Size</span>
                        <select id="sizeselect" name="sizeselect" class="product-option">
                            <option value="">Select Size</option>
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
                            <option value="XXL">XXL</option>
                        </select>
                    </div>
                </div>
                <input type="file" id="screenImage" accept="image/*" style="display: none;">
            </aside>

            <!-- Mueve los modales fuera del <aside> -->
            <!-- Modal para seleccionar color -->
            <div id="colorModal" class="modal">
                <div class="modal-content">
                    <span class="close" id="closeColorModal">&times;</span>
                    <h3>Select Color</h3>
                    <div id="colorContainer" class="color-container">
                        <!-- Aquí se agregarán los botones de colores dinámicamente desde JavaScript -->
                    </div>
                    <!-- Input oculto para almacenar el color seleccionado -->
                    <input type="hidden" id="colorselect" name="colorselect" value="">
                </div>
            </div>

            <!-- Menú flotante para agregar texto -->
            <div id="textMenu" class="text-menu" style="display: none; position: absolute;">
                <div class="text-menu-content">
                    <h3>Add Text</h3>
                    <label for="textInput">Text:</label>
                    <input type="text" id="textInput" placeholder="Write your custom text">

                    <label for="fontFamilySelectMenu">Font Family:</label>
                    <select id="fontFamilySelectMenu"></select>

                    <label for="fontStyleSelectMenu">Font Style:</label>
                    <select id="fontStyleSelectMenu">
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                        <option value="italic">Italic</option>
                        <option value="bolditalic">Bold Italic</option>
                    </select>

                    <label for="fontSizeSelectMenu">Font Size:</label>
                    <input type="number" id="fontSizeSelectMenu" min="10" max="100" value="20">

                    <label for="textColorInput">Color:</label>
                    <input type="color" id="textColorInput" value="#000000">

                    <button id="addTextToCanvasBtn" class="add-text-button">Add Text</button>
                    <button id="closeTextMenuBtn" class="close-text-menu-button" onclick="closeTextMenu()">Cancel</button>
                </div>
            </div>
            <main class="main-content">
                <div class="canvas-container">
                    <img id="backgroundImage" src="bg.jpg" alt="Background">
                    <canvas id="canvas"></canvas>
                </div>


                <div class="product-grid">
                    <h3>Available Products</h3>
                    <div class="grid">
                        <?php
                        while ($row_product = $db->get_all_row($res_products)) {
                        ?>
                           <div class="product-card" data-image="/<?php echo $row_product['image']; ?>" data-id="<?php echo $row_product['p_cat_id']; ?>" data-price="<?php echo $row_product['cost_price']; ?>" data-name="<?php echo htmlspecialchars($row_product['product_name']); ?>">
                                <div class="product-image">
                                    <img src="/<?php echo $row_product['image']; ?>" alt="<?php echo htmlspecialchars($row_product['product_name']); ?>">
                                </div>
                                <div class="product-info">
                                    <h4><?php echo htmlspecialchars($row_product['product_name']); ?></h4>
                                    <p>Code: <?php echo htmlspecialchars($row_product['code']); ?></p>
                                    <p>Price: $<?php echo htmlspecialchars($row_product['cost_price']); ?></p>
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

    <!-- Modal para la Calculadora de Precios -->
    <div id="priceCalculatorModal" class="price-modal">
        <div class="price-modal-content">
            <span class="price-close" id="closePriceModal">&times;</span>
            <h2>Price Calculator</h2>
            <p>Your Product: <strong id="selectedProductName">None</strong></p>

            <div class="modal-section">
                <label for="quantity">Quantity</label>
                <input type="number" id="quantity" placeholder="Enter quantity" min="1" value="1">
            </div>

            <div class="modal-section">
                <label>Ink Colors in Your Design</label>
                <div class="ink-colors">
                    <div class="color-selector">
                        <span class="color-label">Front Side</span>
                        <div class="controls">
                            <button onclick="changeValue('front', -1)">-</button>
                            <input type="number" id="front" value="1" min="0" max="4" readonly>
                            <button onclick="changeValue('front', 1)">+</button>
                        </div>
                    </div>
                    <div class="color-selector">
                        <span class="color-label">Back Side</span>
                        <div class="controls">
                            <button onclick="changeValue('back', -1)">-</button>
                            <input type="number" id="back" value="0" min="0" max="4" readonly>
                            <button onclick="changeValue('back', 1)">+</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-section">
                <label for="zipcode">Delivering to ZIP Code</label>
                <input type="text" id="zipcode" placeholder="Enter ZIP code" value="33101">
            </div>

            <div class="modal-section">
                <p><strong>Total Price: $<span id="totalPrice">0.00</span></strong></p>
            </div>

            <button class="add-to-cart" onclick="addToCart()">Add to Cart</button>
        </div>
    </div>
    <!-- Modal para la Calculadora de Precios -->
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
        var currentProduct = "<?php echo $p_cat_id; ?>";
        var defaultImage = "<?php echo $default_image; ?>";
        var rand = currentUUID;
    </script>
    <script>

        // Iniciar el contador del carrito (puedes inicializarlo dinámicamente si tienes datos en sesión)
        document.addEventListener("DOMContentLoaded", function() {
            // Suponiendo que obtienes el conteo del carrito desde una variable de sesión o backend
            var initialCartCount = <?php echo isset($_SESSION['shopping_cart_qty']) ? count($_SESSION['shopping_cart_qty']) : 0; ?>;
            var test = <?php print_r($_SESSION); ?>;
            document.getElementById('top_cart1').innerText = initialCartCount;
        });
        </script>

<script>
    var pricePerInk = 2; // Ajusta este valor según tu lógica
    // Cerrar el modal al hacer clic en el botón de cerrar
    document.getElementById('closePriceModal').onclick = function() {
        document.getElementById('priceCalculatorModal').style.display = 'none';
    };

    // Cerrar el modal al hacer clic fuera de él
    window.addEventListener('click', function(event) {
        if (event.target == document.getElementById('priceCalculatorModal')) {
            document.getElementById('priceCalculatorModal').style.display = 'none';
        }
    });

    // Añadir event listeners a los inputs para recalcular el precio
    document.getElementById('quantity').addEventListener('input', calculatePrice);
    document.getElementById('front').addEventListener('input', calculatePrice);
    document.getElementById('back').addEventListener('input', calculatePrice);

    // Modificar la función changeValue para recalcular el precio
    function changeValue(field, increment) {
        var input = document.getElementById(field);
        var value = parseInt(input.value) + increment;
        if (value >= 0 && value <= 4) {
            input.value = value;
            calculatePrice();
        }
    }

    // Modificar la función calculatePrice
    function calculatePrice() {
        var quantity = parseInt(document.getElementById('quantity').value) || 0;
        var frontColors = parseInt(document.getElementById('front').value) || 0;
        var backColors = parseInt(document.getElementById('back').value) || 0;
        var zipCode = document.getElementById('zipcode').value;

        if (quantity <= 0) {
            document.getElementById('totalPrice').innerText = '0.00';
            return;
        }

        var totalColors = frontColors + backColors;
        var price = (totalColors * pricePerInk * quantity) + (selectedProductPrice * quantity);

        document.getElementById('totalPrice').innerText = price.toFixed(2);
    }

    function addToCart() {
        console.log('owo')
        var quantity = parseInt(document.getElementById('quantity').value);
        var frontColors = parseInt(document.getElementById('front').value);
        var backColors = parseInt(document.getElementById('back').value);
        var zipCode = document.getElementById('zipcode').value;
        var totalPrice = parseFloat(document.getElementById('totalPrice').innerText);

        var extraPrice = pricePerInk * (frontColors + backColors);

        // Guardar la información adicional en la base de datos
        var formData = new FormData();
        formData.append('uuid', currentUUID);
        formData.append('action', 'saveAdditionalData');
        formData.append('inks_front', frontColors);
        formData.append('inks_back', backColors);
        formData.append('total_price', totalPrice);
        formData.append('quantity', quantity);
        formData.append('zip_code', zipCode);


        fetch('main.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(async data => {
            if (data.success) {
                // Generar y guardar la imagen compuesta
                const dataURL = await generateCompositeImage();
                const image = await saveCompositeImage(dataURL);
                // Agregar al carrito
                AddToCart('shopping_cart', productId, quantity, 'top_cart', 'cartToast', rand, image, extraPrice);
                window.open('/shopping_cart.php','_blank');
            } else {
                console.error('Error saving data:', data.error);
            }
        })
        .catch(error => console.error('Error:', error));

        // Cerrar el modal
        document.getElementById('priceCalculatorModal').style.display = 'none';
    }
</script>
</body>
</html>