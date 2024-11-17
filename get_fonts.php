<?php
function sanitizeFontName($filename) {
    // Quitar la extensión del archivo
    $name = pathinfo($filename, PATHINFO_FILENAME);

    // Reemplazar guiones y subrayados por espacios
    $name = str_replace(['-', '_'], ' ', $name);

    // Convertir el nombre a Capitalización de Título
    $name = ucwords($name);

    // Limpiar espacios múltiples
    return trim($name);
}


function detectFontStyle($filename) {
    $styles = [];

    // Buscar palabras clave en el nombre del archivo para determinar el estilo
    if (preg_match('/\bBold\b/i', $filename)) {
        $styles[] = 'bold';
    }
    if (preg_match('/\bItalic\b/i', $filename)) {
        $styles[] = 'italic';
    }
    if (preg_match('/\bBlack\b/i', $filename)) {
        $styles[] = 'black';
    }
    if (empty($styles)) {
        $styles[] = 'normal';
    }

    return implode(' ', $styles); // Combina los estilos encontrados (puede ser "bold italic", etc.)
}

function getFontsFromDirectory($dir) {
    $fonts = array();
    $files = scandir($dir);
    foreach ($files as $file) {
        if (preg_match("/\.(ttf|woff|otf)$/", $file)) {
            $fontName = sanitizeFontName($file);
            $fontStyle = detectFontStyle($file);
            $fonts[] = array(
                'name' => $fontName,
                'file' => $file,
                'style' => $fontStyle
            );
        }
    }
    return $fonts;
}

// Ruta de la carpeta donde están las fuentes
$fontsDirectory = __DIR__ . '/fonts';
$fonts = getFontsFromDirectory($fontsDirectory);

// Retornar los datos en formato JSON
header('Content-Type: application/json');
echo json_encode($fonts);
?>
