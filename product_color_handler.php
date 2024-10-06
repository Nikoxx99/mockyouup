<?php
// Habilitar la visualización de errores solo en el entorno de desarrollo
include("dbconfig.php");

try {
    $action = isset($_POST['action']) ? $_POST['action'] : null;

    if ($action == 'getColors') {
        // Obtener los colores desde la tabla product_color_map
        $product_id = isset($_POST['product_id']) ? $_POST['product_id'] : null;

        if ($product_id === null) {
            throw new Exception("ID de producto no proporcionado.");
        }

        // Consulta para obtener los colores del producto
        $sql = "SELECT color, colorcode FROM product_color_map WHERE p_cat_id = '$product_id'";
        $result = mysqli_query($dbcon, $sql);

        if (!$result) {
            throw new Exception("Error en la consulta de colores: " . mysqli_error($dbcon));
        }

        $colors = [];
        if (mysqli_num_rows($result) > 0) {
            while ($row = mysqli_fetch_assoc($result)) {
                $colors[] = [
                    'color' => $row['color'],
                    'colorcode' => $row['colorcode']
                ];
            }
            echo json_encode(['msg' => 'yes', 'colors' => $colors]);
        } else {
            echo json_encode(['msg' => 'no', 'colors' => []]);
        }

    } elseif ($action == 'getImageByColor') {
        // Obtener la imagen según el color seleccionado
        $product_id = isset($_POST['product_id']) ? $_POST['product_id'] : null;
        $color = isset($_POST['color']) ? $_POST['color'] : null;

        if ($product_id === null || $color === null) {
            throw new Exception("ID de producto o color no proporcionado.");
        }

        // Consulta para obtener la imagen correspondiente al color seleccionado
        $sql = "SELECT p_image FROM images WHERE p_id = '$product_id' AND color = '$color'";
        $result = mysqli_query($dbcon, $sql);

        if (!$result) {
            throw new Exception("Error en la consulta de imagen: " . mysqli_error($dbcon));
        }

        if (mysqli_num_rows($result) > 0) {
            $row = mysqli_fetch_assoc($result);
            echo json_encode(['msg' => 'yes', 'image' => $row['p_image']]);
        } else {
            echo json_encode(['msg' => 'no', 'image' => '']);
        }

    } else {
        throw new Exception("Acción no válida.");
    }

} catch (Exception $e) {
    // Registrar el error en un archivo de log
    error_log($e->getMessage(), 3, 'errors.log');

    // Devolver el error al frontend
    http_response_code(500);
    echo json_encode(['msg' => 'error', 'error' => $e->getMessage()]);
}
