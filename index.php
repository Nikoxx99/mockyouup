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

// Obtener productos de una categoría específica (por ejemplo, categoría 1)
$category_id = 5; // Puedes cambiar esto según tus necesidades
$sql_products = "SELECT * FROM product_category WHERE catmenu_id LIKE '%$category_id%' ORDER BY product_name ASC LIMIT 1";
$res_products = $db->query_execute($sql_products);

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
            <a href="list.php" class="nav-item"><i class="fa-solid fa-list-check"></i> Lista de Mockups</a>
            <strong class="title-maker">
                <p>Design your own T-Shirt with our custom maker</p>
            </strong>
            <button class="nav-item-active"><i class="fa-regular fa-credit-card"></i> Get Quote</button>
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
                    <span>Agregar Texto</span>
                </button>
                <button class="sidebar-button" id="screenImageBtn">
                    <div class="button-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <span>Subir tu logo</span>
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
                        <?php
                        while ($row_product = $db->get_all_row($res_products)) {
                        ?>
                            <div class="product-card" data-image="/<?php echo $row_product['image']; ?>" data-id="<?php echo $row_product['p_cat_id']; ?>">
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

    <!-- Modal para Get Quote -->
    <div id="quoteModal" class="modal">
        <div class="modal-content">
            <span class="close-btn" id="closeModal">&times;</span>
            <div id="stepper">
                <!-- Step 1: Delivery -->
                <div class="step" id="step1">
                    <h2>Delivery Options</h2>
                    <label><input type="radio" name="delivery" value="pickup"> Pick up</label>
                    <label><input type="radio" name="delivery" value="delivery"> Delivery</label>
                </div>

                <!-- Step 2: Payment Method -->
                <div class="step" id="step2">
                    <h2>Payment Method</h2>
                    <label><input type="radio" name="payment" value="credit_card"> Credit Card</label>
                    <label><input type="radio" name="payment" value="paypal"> PayPal</label>
                    <label><input type="radio" name="payment" value="store"> Pay At Store</label>
                    <label><input type="radio" name="payment" value="invoice"> Invoice</label>
                </div>

                <!-- Step 3: Billing Information -->
                <div class="step" id="step3">
                    <h2>Billing Information</h2>
                    <input type="text" id="firstName" placeholder="First Name">
                    <input type="text" id="lastName" placeholder="Last Name">
                    <input type="text" id="company" placeholder="Company">
                    <input type="email" id="email" placeholder="Email">
                    <input type="tel" id="telephone" placeholder="Telephone">
                    <input type="text" id="address1" placeholder="Address 1">
                    <input type="text" id="address2" placeholder="Address 2">
                    <input type="text" id="city" placeholder="City">
                    <input type="text" id="state" placeholder="State">
                    <input type="text" id="country" placeholder="Country">
                    <input type="text" id="zipCode" placeholder="Zip Code">
                </div>

                <!-- Step 4: Order Review -->
                <div class="step" id="step4">
                    <h2>Order Review</h2>
                    <p>Subtotal: <span id="subtotal">100.00</span></p>
                    <p>Shipping Charge: <span id="shippingCharge">5.00</span></p>
                    <p>Grand Total: <span id="grandTotal">105.00</span></p>

                    <!-- Payment method-specific sections -->
                    
                    <!-- Credit Card Payment -->
                    <div id="creditCardFields" class="payment-fields">
                        <h3>Credit Card Information</h3>
                        <input type="text" id="cardNumber" placeholder="Card Number">
                        <input type="text" id="cardHolder" placeholder="Card Holder Name">
                        <input type="text" id="expirationDate" placeholder="Expiration Date (MM/YY)">
                        <input type="text" id="securityCode" placeholder="Security Code">
                    </div>

                    <!-- PayPal Payment -->
                    <div id="paypalFields" class="payment-fields">
                        <h3>PayPal Information</h3>
                        <input type="email" id="paypalEmail" placeholder="PayPal Email">
                        <button id="continueWithPaypal">Continue with PayPal</button>
                    </div>

                    <!-- Pay at the Store -->
                    <div id="payAtStoreFields" class="payment-fields">
                        <h3>Pay at Store</h3>
                        <p>Your store redemption code: <strong id="storeCode"></strong></p>
                    </div>

                    <!-- Invoice Payment -->
                    <div id="invoiceFields" class="payment-fields">
                        <h3>Invoice</h3>
                        <button id="downloadInvoice">Download Invoice</button>
                    </div>
                </div>

                <div class="stepper-buttons">
                    <button id="prevBtn">Previous</button>
                    <button id="nextBtn">Next</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
    <script>
        var initialData = <?php echo json_encode($mockupData); ?>;
        var currentUUID = "<?php echo $uuid; ?>";
    </script>
    <script src="script.js"></script>
    <script src="modal.js"></script>
</body>
</html>