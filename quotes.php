<?php
include("dbconfig.php");
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'phpmailer/PHPMailer.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['send_email'])) {
    $recipientEmail = $_POST['email'];
    $product = $_POST['product'];
    $quantity = $_POST['quantity'];
    $frontColors = $_POST['frontColors'];
    $backColors = $_POST['backColors'];
    $price = $_POST['price'];

    // Información del correo
    $mail = new PHPMailer(true);
    try {
        // Configuración del servidor SMTP
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com'; // Cambia esto a tu servidor SMTP
        $mail->SMTPAuth = true;
        $mail->Username = 'tu_correo@gmail.com'; // Tu correo
        $mail->Password = 'tu_contraseña'; // Tu contraseña
        $mail->SMTPSecure = 'tls';
        $mail->Port = 587;

        // Remitente y destinatario
        $mail->setFrom('tu_correo@gmail.com', 'Tu Empresa');
        $mail->addAddress($recipientEmail);

        // Contenido del correo
        $mail->isHTML(true);
        $mail->Subject = 'Your All-Inclusive Price Quote';
        $mail->Body = "
        <h2>Your All-Inclusive Price</h2>
        <p>Thanks for saving a quote with us. Here it is!</p>
        <h3 style='color: green;'>$price each | Total: $".($price * $quantity)."</h3>
        <p>You selected <strong>$quantity $product</strong> with <strong>$frontColors color(s) on the front</strong> and <strong>$backColors color(s) on the back</strong>.</p>
        <h4>What's Included:</h4>
        <ul>
            <li>Screen Printing with $frontColors Color(s) Front, $backColors Color(s) Back</li>
            <li>FREE delivery to your location</li>
            <li>Professional Design Review</li>
            <li>All Printing and Artwork Set-up</li>
            <li>Money-Back Guarantee</li>
        </ul>
        <p>If you have any questions, feel free to contact us. Thank you for choosing our services!</p>
        ";

        // Enviar el correo
        $mail->send();
        echo 'Email sent successfully.';
    } catch (Exception $e) {
        echo "Email could not be sent. Error: {$mail->ErrorInfo}";
    }
}

$sql_products = "
    SELECT 
        dlp.*, 
        pc.p_cat_id, 
        pc.product_name,
        pc.image,
        pc.code,
        pc.cost_price
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
    <title>Price Calculator</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .layout {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
            gap: 20px;
            box-sizing: border-box;
        }
        .columns {
            display: flex;
            padding: 20px;
            gap: 20px;
            width: 100%;
            justify-content: center;
        }
        .product-list {
            width: 300px;
            height: 600px;
            overflow-y: scroll;
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 10px;
        }
        .product-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .product-card:hover {
            background-color: #f0f0f0;
        }
        .product-card img {
            max-width: 100px;
            max-height: 100px;
            object-fit: cover;
        }
        .product-info {
            text-align: center;
            margin-top: 10px;
        }
        .product-info p {
            margin: 5px 0;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            width: 320px;
            text-align: center;
            height: fit-content;
        }
        h1 {
            font-size: 20px;
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-top: 10px;
            font-weight: bold;
        }
        input[type="number"], input[type="text"] {
            width: calc(100% - 20px);
            padding: 10px;
            margin: 10px 0;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        .color-selector {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .color-label {
            width: 50%;
            text-align: left;
            font-weight: bold;
        }
        .controls {
            width: 50%;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .controls button {
            padding: 5px 10px;
            font-size: 18px;
            cursor: pointer;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            width: 30px;
        }
        .controls input[type="number"] {
            width: 50px;
            text-align: center;
            border: 1px solid #ccc;
            border-radius: 5px;
            margin: 0 5px;
        }
        .get-quote {
            background-color: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        .get-quote:disabled {
            background-color: #ccc;
        }
        .pricing-tips {
            text-align: left;
            margin-top: 20px;
        }
        .pricing-tips ul {
            padding-left: 20px;
        }
        .pricing-tips li {
            font-size: 14px;
            margin-bottom: 10px;
        }

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            justify-content: center;
            align-items: center;
        }
        .modal-content {
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            width: 90%;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            max-height: 80%;
            overflow-y: auto;
        }
        .modal-content h3 {
            margin-bottom: 10px;
        }
        .close-modal {
            background-color: #007bff;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
        }
        .close-modal:hover {
            background-color: #0056b3;
        }

        /* Navbar inferior para móviles */
        .navbar-bottom {
            display: none;
        }
        @media (max-width: 768px) {
            .columns {
                flex-direction: column;
                align-items: center;
            }
            .product-list {
                display: none;
            }
            .navbar-bottom {
                display: flex;
                position: fixed;
                bottom: 0;
                width: 100%;
                background-color: #007bff;
                color: white;
                text-align: center;
                padding: 10px 0;
            }
            .navbar-bottom button {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                width: 100%;
            }
        }
    </style>
</head>
<body>

<div class="layout">
    <!-- Logo -->
    <img src="logo.svg" alt="Starsbranding Logo" class="logo" style="max-width: 200px;">

    <div class="columns">
        <!-- Product list -->
        <div class="product-list" id="productList">
            <h3>Select a Product</h3>
            <?php
            while ($row_product = $db->get_all_row($res_products)) {
            ?>
                <div class="product-card" onclick="selectProduct('<?php echo htmlspecialchars($row_product['product_name']); ?>', '<?php echo $row_product['cost_price']; ?>')">
                    <img src="/<?php echo $row_product['image']; ?>" alt="<?php echo htmlspecialchars($row_product['product_name']); ?>">
                    <div class="product-info">
                        <h4><?php echo htmlspecialchars($row_product['product_name']); ?></h4>
                        <p>Code: <?php echo htmlspecialchars($row_product['code']); ?></p>
                        <p>Price: $<?php echo number_format($row_product['cost_price'], 2); ?></p>
                    </div>
                </div>
            <?php
            }
            ?>
        </div>

        <!-- Price calculator -->
        <div class="container">
            <h1>Calculate Your Price</h1>
            <p>Your Product: <strong id="selectedProduct">None</strong></p>
            <label for="quantity">How many will you need?</label>
            <input type="number" id="quantity" placeholder="Enter quantity" disabled>

            <label>How many ink colors are in your design?</label>

            <div class="color-selector">
                <span class="color-label">FRONT SIDE</span>
                <div class="controls">
                    <button onclick="changeValue('front', -1)" disabled>-</button>
                    <input type="number" id="front" value="1" min="0" max="10" readonly disabled>
                    <button onclick="changeValue('front', 1)" disabled>+</button>
                </div>
            </div>

            <div class="color-selector">
                <span class="color-label">BACK SIDE</span>
                <div class="controls">
                    <button onclick="changeValue('back', -1)" disabled>-</button>
                    <input type="number" id="back" value="0" min="0" max="10" readonly disabled>
                    <button onclick="changeValue('back', 1)" disabled>+</button>
                </div>
            </div>

            <label for="zipcode">Delivering to:</label>
            <input type="text" id="zipcode" placeholder="Enter ZIP code" value="33101" disabled>

            <button class="get-quote" onclick="calculatePrice()" disabled>Get Quote</button>

            <div class="pricing-tips">
                <p><strong>Pricing Tips:</strong></p>
                <ul>
                    <li>Printing on colored garments will cost more than printing on white.</li>
                    <li>Colors count in screen printing because each one requires a unique screen.</li>
                    <li>The easiest way to reduce the cost is by designing with fewer colors.</li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Modal for product list in mobile -->
<div class="modal" id="productModal">
    <div class="modal-content">
        <h3>Select a Product</h3>
        <div id="modalProductList">
            <?php
            // Reset the result pointer and fetch products again for the modal
            mysqli_data_seek($res_products, 0);
            while ($row_product = $db->get_all_row($res_products)) {
            ?>
                <div class="product-card" onclick="selectProduct('<?php echo htmlspecialchars($row_product['product_name']); ?>', '<?php echo $row_product['cost_price']; ?>')">
                    <img src="/<?php echo $row_product['image']; ?>" alt="<?php echo htmlspecialchars($row_product['product_name']); ?>">
                    <div class="product-info">
                        <h4><?php echo htmlspecialchars($row_product['product_name']); ?></h4>
                        <p>Code: <?php echo htmlspecialchars($row_product['code']); ?></p>
                        <p>Price: $<?php echo number_format($row_product['cost_price'], 2); ?></p>
                    </div>
                </div>
            <?php
            }
            ?>
        </div>
        <button class="close-modal" onclick="closeProductModal()">Close</button>
    </div>
</div>

<!-- Navbar inferior para móviles -->
<div class="navbar-bottom" id="navbarBottom">
    <button onclick="openProductModal()">Select Product</button>
</div>

<!-- Modal Structure for price summary -->
<div class="modal" id="priceModal">
    <div class="modal-content">
        <h2>Price Calculation</h2>
        <p><strong>Product:</strong> <span id="modalProduct">None</span></p>
        <p><strong>Quantity:</strong> <span id="modalQuantity">0</span></p>
        <p><strong>Front Colors:</strong> <span id="modalFrontColors">0</span></p>
        <p><strong>Back Colors:</strong> <span id="modalBackColors">0</span></p>
        <p class="price">Total: $<span id="modalPrice">0.00</span></p>

        <!-- Formulario para enviar el email -->
        <form method="POST" action="" id="emailForm">
            <input type="email" name="email" placeholder="Enter your email" required>
            <input type="hidden" name="product" id="formProduct">
            <input type="hidden" name="quantity" id="formQuantity">
            <input type="hidden" name="frontColors" id="formFrontColors">
            <input type="hidden" name="backColors" id="formBackColors">
            <input type="hidden" name="price" id="formPrice">
            <button type="submit" name="send_email" class="close-modal">Send Quote</button>
        </form>

        <button class="close-modal" onclick="closeModal()">Close</button>
    </div>
</div>

<script>
    let pricePerInk = 2.5;
    let selectedProductPrice = 0;

    function changeValue(field, increment) {
        let input = document.getElementById(field);
        let value = parseInt(input.value) + increment;
        if (value >= 0 && value <= 10) {
            input.value = value;
        }
    }

    function selectProduct(productName, productPrice) {
        document.getElementById('selectedProduct').innerText = productName;
        selectedProductPrice = parseFloat(productPrice);

        // Enable inputs and buttons
        document.getElementById('quantity').disabled = false;
        document.getElementById('zipcode').disabled = false;
        document.querySelectorAll('button').forEach(button => button.disabled = false);
        document.querySelectorAll('input').forEach(input => input.disabled = false);

        // Close the product modal on mobile
        closeProductModal();
    }

    function calculatePrice() {
        const product = document.getElementById('selectedProduct').innerText;
        const quantity = document.getElementById('quantity').value;
        const frontColors = document.getElementById('front').value;
        const backColors = document.getElementById('back').value;

        if (product === 'None' || quantity === '' || quantity <= 0) {
            alert('Please select a product and enter a valid quantity.');
            return;
        }

        const totalColors = parseInt(frontColors) + parseInt(backColors);
        const price = (totalColors * pricePerInk * quantity) + (selectedProductPrice * quantity);

        // Llenar el modal con los datos
        document.getElementById('modalProduct').innerText = product;
        document.getElementById('modalQuantity').innerText = quantity;
        document.getElementById('modalFrontColors').innerText = frontColors;
        document.getElementById('modalBackColors').innerText = backColors;
        document.getElementById('modalPrice').innerText = price.toFixed(2);

        // Llenar el formulario oculto para el envío de email
        document.getElementById('formProduct').value = product;
        document.getElementById('formQuantity').value = quantity;
        document.getElementById('formFrontColors').value = frontColors;
        document.getElementById('formBackColors').value = backColors;
        document.getElementById('formPrice').value = price.toFixed(2);

        // Mostrar el modal
        document.getElementById('priceModal').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('priceModal').style.display = 'none';
    }

    function openProductModal() {
        document.getElementById('productModal').style.display = 'flex';
    }

    function closeProductModal() {
        document.getElementById('productModal').style.display = 'none';
    }
</script>

</body>
</html>
