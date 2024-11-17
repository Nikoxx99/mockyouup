// Variables globales
let canvas, originalImage, fabricBackgroundImage, position, size, zoomLevel = 0.8, panX = 400, panY = -255;
let zoomAnimation = null;
let targetZoom = 1; // Nivel de zoom inicial
let uuid = new URLSearchParams(window.location.search).get('uuid') || generateUUID();
let backgroundImage = null;
let customMockupImageLoaded = false;  // Banderas para detectar cambios
let newBackgroundImageLoaded = false;
let currentBackgroundId = null;
let addedTexts = [];
let productId = null;

let fonts = []; // Variable global para almacenar las fuentes disponibles

let isDesktop = false;  // Variable para detectar si es un dispositivo de escritorio

// Variables para gestos táctiles
let lastPosX = 0;
let lastPosY = 0;
let isTouchDragging = false;
let touchStartPos = null;
let lastDistance = null;

let currentProductName = 'Product Name';
let currentProductPrice = 0;


// Función para generar UUID (si no está disponible en el lado del servidor)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}

// Detectar si es desktop
if (window.innerWidth > 768) {
    isDesktop = true;
    } else {
    isDesktop = false;
}

// Función debounce para optimizar la aplicación de perspectiva
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// document.addEventListener('DOMContentLoaded', function() {
//     var productCards = document.querySelectorAll('.product-card');
//     var getQuoteBtn = document.getElementById('getQuoteBtn');

//     productCards.forEach(function(card) {
//         card.addEventListener('click', function() {
//             // Obtener el ID del producto seleccionado
//             productId = card.getAttribute('data-id');

//             // Actualizar la URL con el parámetro p_cat_id
//             var currentUrl = new URL(window.location.href);
//             currentUrl.searchParams.set('p_cat_id', productId);
//             window.history.pushState({}, '', currentUrl);

//             // Verificar si se han seleccionado color y talla
//             checkIfColorAndSizeSelected();
//         });
//     });
// });

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    setupEventListeners();
    defineDeleteControl();
    defineEditControl();

    const urlParams = new URLSearchParams(window.location.search);
    productId = urlParams.get('p_cat_id');  // Obtener el p_cat_id de la URL

    // initialData esta definida en index.php ya que es una variable de PHP
    if (initialData) {
        loadInitialData(initialData);

        // Actualizar productId si no está definido
        if (!productId && initialData.product_id) {
            productId = initialData.product_id;
        }
    }

    // Si hay un productId, cargar los colores sin cambiar el fondo
    if (productId) {
        const productCard = document.querySelector(`.product-card[data-id="${productId}"]`);
        currentProductName = productCard.getAttribute('data-name');
        currentProductPrice = parseFloat(productCard.getAttribute('data-price')) || 0;
        fetchProductColorsAndPopulate(productId);
    }

    // Añadir event listeners a las tarjetas de productos
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', handleProductCardClick);
    });

    // Cargar las fuentes desde el servidor para el selector de fuentes
    fetch('get_fonts.php')
    .then(response => response.json())
    .then(data => {
        fonts = data; // Guardamos las fuentes en la variable global

        const fontFamilySelect = document.getElementById('fontFamilySelectMenu');
        data.forEach(font => {
            const option = document.createElement('option');

            option.value = font.name;
            option.textContent = font.name;

            fontFamilySelect.appendChild(option);

            // Cargar la fuente utilizando la API FontFace
            const fontFace = new FontFace(font.name, `url(fonts/${font.file})`);

            fontFace.load().then(function(loadedFontFace) {
                // Agregar la fuente al documento
                document.fonts.add(loadedFontFace);

                // Aplicar la previsualización de la fuente en el selector
                option.style.fontFamily = font.name;

            }).catch(function(error) {
                console.error(`Error al cargar la fuente ${font.name}:`, error);
            });
        });
    })
    .then(() => {
        // Después de cargar las fuentes, podemos cargar los datos iniciales
        if (initialData) {
            loadInitialData(initialData);
        }
    })
    .catch(error => console.error('Error al cargar las fuentes:', error));
});

// Obtener elementos del DOM
var colorModal = document.getElementById("colorModal");
var selectColorBtn = document.getElementById("selectColorBtn");
var closeColorModal = document.getElementById("closeColorModal");

// Abrir el modal al hacer clic en el botón
selectColorBtn.onclick = function() {
    colorModal.style.display = "block";
}

// Cerrar el modal al hacer clic en la 'x'
closeColorModal.onclick = function() {
    colorModal.style.display = "none";
}

// Cerrar el modal al hacer clic fuera de él
window.onclick = function(event) {
    if (event.target == colorModal) {
        colorModal.style.display = "none";
    }
}

// Función para verificar si se han seleccionado color y talla
function checkIfColorAndSizeSelected() {
    const selectedColor = document.getElementById('colorselect').value;
    const selectedSize = document.getElementById('sizeselect').value;
    const getQuoteBtn = document.getElementById('getQuoteBtn');

    if (selectedColor && selectedSize && productId) {
        console.log('uwu')
        getQuoteBtn.disabled = false;
        getQuoteBtn.onclick = function() {
            // Abrir el modal de la calculadora de precios
            document.getElementById('priceCalculatorModal').style.display = 'flex';

            // Configurar el producto seleccionado
            selectedProductName = currentProductName;
            selectedProductPrice = currentProductPrice;

            document.getElementById('selectedProductName').innerText = selectedProductName;

            if (initialData.quantity) {
                document.getElementById('quantity').value = initialData.quantity;
            }
            if (initialData.inks_front) {
                document.getElementById('front').value = initialData.inks_front;
            }
            if (initialData.inks_back) {
                document.getElementById('back').value = initialData.inks_back;
            }
            if (initialData.zip_code) {
                document.getElementById('zipcode').value = initialData.zip_code;
            }

            // Calcular el precio inicial
            calculatePrice();
        };
    } else {
        getQuoteBtn.disabled = true;
        getQuoteBtn.onclick = null;
    }
}

async function saveCompositeImage(dataURL) {
    const formData = new FormData();
    formData.append('action', 'saveCompositeImage');
    formData.append('uuid', uuid);
    formData.append('image', dataURL);

    return new Promise((resolve, reject) => {
        fetch('main.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                resolve(data.image)
            } else {
                console.error('Error al guardar la imagen compuesta:', data.error);
            }
        })
        .catch(error => {
            console.error('Error en la solicitud:', error);
        });
    })
}

function handleProductCardClick(event) {
    const card = event.currentTarget;
    const imageUrl = card.getAttribute('data-image');
    productId = card.getAttribute('data-id');
    currentProductName = card.getAttribute('data-name');
    currentProductPrice = parseFloat(card.getAttribute('data-price')) || 0;
    
    // Actualizar la URL con el parámetro p_cat_id
    var currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('p_cat_id', productId);
    window.history.pushState({}, '', currentUrl);
    
    // Limpiar el color seleccionado previamente
    document.getElementById('colorselect').value = '';
    // Deshabilitar el botón de "Get Quote" hasta que se seleccione un color y talla
    checkIfColorAndSizeSelected();
    
    // Cambiar el fondo al de la tarjeta seleccionada (imagen por defecto)
    setCanvasBackground(imageUrl).then(() => {
        console.log('Producto seleccionado:', productId);
        currentBackgroundId = imageUrl; // Actualizar el currentBackgroundId
        debouncedSaveMockup(imageUrl);
        // Después de cambiar el fondo, popular los colores
        fetchProductColorsAndPopulate(productId);
    });
}


// Función para obtener los colores del producto y popular los selectores
function fetchProductColorsAndPopulate(productId) {
    console.log('Obteniendo colores para el producto:', productId);
    // Limpiar el contenedor de colores
    const colorContainer = document.getElementById('colorContainer');
    colorContainer.innerHTML = '';

    // Realiza una petición AJAX para obtener los colores disponibles para el producto
    fetch('product_color_handler.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `action=getColors&product_id=${productId}`
    })
    .then(response => response.text())
    .then(data => {
        try {
            const jsonData = JSON.parse(data);
            if (jsonData.msg === 'yes') {
                // Popular los colores en el contenedor de botones de color
                populateColorOptions(jsonData.colors);

                // Añadir los event listeners justo después de generar los botones
                addColorButtonListeners(productId, jsonData.colors); // Pasamos los colores obtenidos
            } else {
                console.log('No se encontraron colores para este producto.');
            }
        } catch (error) {
            console.error('Error procesando la respuesta JSON:', error, data);
        }
    })
    .catch(error => console.error('Error obteniendo colores:', error));
}

// Función para añadir event listeners a los botones de color después de generar los botones
function addColorButtonListeners(productId, colors) {
    document.querySelectorAll('.color-button').forEach(button => {
        button.addEventListener('click', function() {
            const selectedColor = button.getAttribute('data-color');
            const selectedColorCode = button.getAttribute('data-colorcode'); // Obtenemos el código de color

            // Actualizar el input oculto con el color seleccionado
            document.getElementById('colorselect').value = selectedColor;

            // Cambiar la imagen del producto según el color seleccionado
            updateProductImageWithColor(productId, selectedColor);

            // Actualizar el color de previsualización en el botón del sidebar
            document.getElementById('colorPreview').style.backgroundColor = `#${selectedColorCode}`; // Usamos el código hexadecimal

            // Guardar color y talla
            debouncedSaveMockup();

            // Verificar si se han seleccionado ambos
            checkIfColorAndSizeSelected();

            // Cerrar el modal después de seleccionar el color
            colorModal.style.display = "none";
        });
    });
}

// Listener para el selector de tallas
document.getElementById('sizeselect').addEventListener('change', function() {
    // Guardar color y talla
    debouncedSaveMockup();

    // Verificar si se han seleccionado ambos
    checkIfColorAndSizeSelected();
});

// Función para popular los colores (creamos los botones de color)
function populateColorOptions(colors) {
    const colorContainer = document.getElementById('colorContainer');
    colorContainer.innerHTML = '';  // Limpiamos los colores previos

    colors.forEach(colorObj => {
        const colorButton = document.createElement('button');
        colorButton.classList.add('color-button');
        colorButton.style.backgroundColor = `#${colorObj.colorcode}`;  // Usamos el código de color
        colorButton.setAttribute('data-color', colorObj.color);
        colorButton.setAttribute('data-colorcode', colorObj.colorcode); // Guardamos el código hexadecimal
        colorContainer.appendChild(colorButton);
    });
}

// Función para cambiar la imagen del producto según el color seleccionado
function updateProductImageWithColor(productId, color) {
    // Realiza una petición AJAX para obtener la imagen del color seleccionado
    fetch('product_color_handler.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `action=getImageByColor&product_id=${productId}&color=${encodeURIComponent(color)}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.msg === 'yes') {
            // Cambiar la imagen de fondo según el color seleccionado
            setCanvasBackground(`/${data.image}`).then(() => {
                currentBackgroundId = `/${data.image}`;

                // Asegurarse de guardar esta nueva imagen en la base de datos
                debouncedSaveMockup(currentBackgroundId);  // Guardar la nueva imagen seleccionada
            });
        } else {
            console.log('No se encontró imagen para este color.');
        }
    })
    .catch(error => console.error('Error actualizando imagen con el color:', error));
}

function setCanvasBackground(imageUrl) {
    backgroundImage = imageUrl;
    return new Promise((resolve, reject) => {
        fabric.Image.fromURL(imageUrl, function(img) {
            if (!img) {
                console.error('Error al cargar la imagen:', imageUrl);
                reject('Error al cargar la imagen');
                return;
            }
            img.set({
                left: 0,
                top: 0,
                originX: 'left',
                originY: 'top'
            });
            fabricBackgroundImage = img;
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
            resolve();
        }, { crossOrigin: 'anonymous' });
    });
}

function initCanvas() {
    const canvasContainer = document.querySelector('.canvas-container');
    const containerWidth = canvasContainer.offsetWidth;
    const containerHeight = canvasContainer.offsetHeight;

    canvas = new fabric.Canvas('canvas', {
        width: containerWidth,
        height: containerHeight
    });

    canvas.setWidth(containerWidth);
    canvas.setHeight(containerHeight);
    canvas.wrapperEl.style.position = 'absolute';
    canvas.wrapperEl.style.top = '0';
    canvas.wrapperEl.style.left = '0';
    canvas.wrapperEl.style.width = '100%';
    canvas.wrapperEl.style.height = '100%';

    // Nivel de zoom inicial
    canvas.setZoom(zoomLevel);

    // En el evento de zoom, después de actualizar el zoom
    canvas.on('mouse:wheel', function(opt) {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        const zoomFactor = 0.999 ** delta;

        targetZoom = zoom * zoomFactor;

        if (targetZoom > 5) targetZoom = 5;
        if (targetZoom < 0.5) targetZoom = 0.5;

        // Cancelar cualquier animación de zoom en curso
        if (zoomAnimation) {
            cancelAnimationFrame(zoomAnimation);
        }

        animateZoom(opt.e);

        opt.e.preventDefault();
        opt.e.stopPropagation();

        debouncedSaveMockup();
    });
    // Eventos de ratón
    canvas.on('mouse:down', function(opt) {
        if (!canvas.getActiveObject()) {
            canvas.isDragging = true;
            canvas.selection = false;
            lastPosX = opt.e.clientX;
            lastPosY = opt.e.clientY;
        }
    });

    canvas.on('mouse:move', function(opt) {
        if (canvas.isDragging) {
            const e = opt.e;
            const zoom = canvas.getZoom() || 1;
            const vpt = canvas.viewportTransform;

            const deltaX = (e.clientX - lastPosX) / zoom;
            const deltaY = (e.clientY - lastPosY) / zoom;

            vpt[4] += deltaX;
            vpt[5] += deltaY;

            // Aplicar límites al desplazamiento
            limitViewportTransform();

            canvas.requestRenderAll();
            lastPosX = e.clientX;
            lastPosY = e.clientY;
        }
    });

    canvas.on('mouse:up', function(opt) {
        if (canvas.isDragging) {
            debouncedSaveMockup();
        }
        canvas.isDragging = false;
        canvas.selection = true;
    });

    // Eventos táctiles
    canvas.upperCanvasEl.addEventListener('touchstart', function(e) {
        handleTouchStart(e);
        // No llamamos a e.preventDefault() aquí para permitir interacción con objetos
    }, { passive: false });

    canvas.upperCanvasEl.addEventListener('touchmove', function(e) {
        handleTouchMove(e);
        // Llamamos a e.preventDefault() solo si estamos haciendo pan o zoom
        if (isTouchDragging || e.touches.length === 2) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { passive: false });

    canvas.upperCanvasEl.addEventListener('touchend', function(e) {
        handleTouchEnd(e);
        // No llamamos a e.preventDefault() aquí
    }, { passive: false });


    // Ajustar la opción para soporte táctil
    canvas.allowTouchScrolling = true;

    window.addEventListener('resize', resizeCanvas);

    // Añadir evento para guardar el mockup cuando se mueva un objeto
    canvas.on('object:modified', debouncedSaveMockup);
}
function animateZoom(event) {
    const zoom = canvas.getZoom();
    const deltaZoom = targetZoom - zoom;
    const step = deltaZoom / 10; // Controla la velocidad de la animación

    if (Math.abs(deltaZoom) > 0.001) {
        canvas.zoomToPoint({ x: event.offsetX, y: event.offsetY }, zoom + step);

        // Aplicar límites después del zoom
        limitViewportTransform();

        zoomAnimation = requestAnimationFrame(function() {
            animateZoom(event);
        });
    } else {
        canvas.zoomToPoint({ x: event.offsetX, y: event.offsetY }, targetZoom);

        // Aplicar límites después del zoom
        limitViewportTransform();
    }
}
function handleTouchStart(e) {
    const touch = e.touches[0];
    if (!touch) return;

    const pointer = canvas.getPointer(touch);
    const activeObject = canvas.findTarget(touch);

    if (e.touches.length === 1) {
        if (!activeObject) {
            // Toca el fondo, activar pan
            isTouchDragging = true;
            const x = touch.pageX;
            const y = touch.pageY;

            if (typeof x !== 'number' || typeof y !== 'number') return;

            touchStartPos = { x, y };
            lastPosX = x;
            lastPosY = y;
        } else {
            // Toca un objeto, no activar pan
            isTouchDragging = false;
        }
    } else if (e.touches.length === 2) {
        // Zoom con dos dedos, solo si no se tocan objetos
        if (!activeObject) {
            isTouchDragging = false;
            lastDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }
}

function handleTouchMove(e) {
    if (e.touches.length === 1 && isTouchDragging) {
        // Desplazamiento (pan) con un dedo
        const touch = e.touches[0];
        if (!touch) return;

        const x = touch.pageX;
        const y = touch.pageY;

        if (typeof x !== 'number' || typeof y !== 'number') return;

        const zoom = canvas.getZoom() || 1;
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

        const deltaX = (x - lastPosX) / zoom;
        const deltaY = (y - lastPosY) / zoom;

        if (isNaN(deltaX) || isNaN(deltaY)) {
            console.error('deltaX or deltaY is NaN:', deltaX, deltaY);
            return;
        }

        vpt[4] += deltaX;
        vpt[5] += deltaY;

        limitViewportTransform();

        canvas.requestRenderAll();
        lastPosX = x;
        lastPosY = y;
    } else if (e.touches.length === 2 && !canvas.getActiveObject()) {
        // Zoom con gesto de pinza (pinch), solo si no hay objeto activo
        const distance = getDistance(e.touches[0], e.touches[1]);
        if (isNaN(distance)) return;

        const zoom = canvas.getZoom() || 1;
        const deltaDistance = distance - lastDistance;
        let zoomFactor = deltaDistance / 200;

        let newZoom = zoom + zoomFactor;
        if (newZoom > 5) newZoom = 5;
        if (newZoom < 0.5) newZoom = 0.5;

        const point = new fabric.Point(
            (e.touches[0].pageX + e.touches[1].pageX) / 2,
            (e.touches[0].pageY + e.touches[1].pageY) / 2
        );

        canvas.zoomToPoint(point, newZoom);

        limitViewportTransform();

        canvas.requestRenderAll();

        lastDistance = distance;
    } else {
        isTouchDragging = false;
    }
}

function handleTouchEnd(e) {
    if (e.touches.length === 0) {
        isTouchDragging = false;
        lastDistance = null;
        touchStartPos = null;

        debouncedSaveMockup();
    }
}

function getDistance(touch1, touch2) {
    const x1 = touch1.pageX;
    const y1 = touch1.pageY;
    const x2 = touch2.pageX;
    const y2 = touch2.pageY;

    if (typeof x1 !== 'number' || typeof y1 !== 'number' || typeof x2 !== 'number' || typeof y2 !== 'number') {
        console.error('Invalid touch coordinates for distance calculation.');
        return NaN;
    }

    return Math.sqrt(
        Math.pow(x2 - x1, 2) +
        Math.pow(y2 - y1, 2)
    );
}

// Asegurarse de que limitViewportTransform esté correctamente implementada
function limitViewportTransform() {
    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;

    // Asegurarse de que la imagen de fondo esté cargada
    if (!fabricBackgroundImage || !fabricBackgroundImage.width || !fabricBackgroundImage.height) {
        return;
    }

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    const imgWidth = fabricBackgroundImage.width * fabricBackgroundImage.scaleX * zoom;
    const imgHeight = fabricBackgroundImage.height * fabricBackgroundImage.scaleY * zoom;

    const maxPanX = (imgWidth - canvasWidth) / 2;
    const maxPanY = (imgHeight - canvasHeight) / 2;

    // Si la imagen es más pequeña que el canvas, centramos la imagen
    if (imgWidth <= canvasWidth) {
        vpt[4] = (canvasWidth - imgWidth) / 2;
    } else {
        if (vpt[4] > maxPanX) {
            vpt[4] = maxPanX;
        } else if (vpt[4] < -maxPanX) {
            vpt[4] = -maxPanX;
        }
    }

    if (imgHeight <= canvasHeight) {
        vpt[5] = (canvasHeight - imgHeight) / 2;
    } else {
        if (vpt[5] > maxPanY) {
            vpt[5] = maxPanY;
        } else if (vpt[5] < -maxPanY) {
            vpt[5] = -maxPanY;
        }
    }
}

function resizeCanvas() {
    const canvasContainer = document.querySelector('.canvas-container');
    const containerWidth = canvasContainer.offsetWidth;
    const containerHeight = canvasContainer.offsetHeight;
    
    canvas.setWidth(containerWidth);
    canvas.setHeight(containerHeight);
    canvas.renderAll();
}

function addTextToCanvas() {
    const text = document.getElementById('textInput').value;
    const fontFamily = document.getElementById('fontFamilySelectMenu').value;
    const fontStyle = document.getElementById('fontStyleSelectMenu').value; // Negrita, cursiva, etc.
    const fontSize = document.getElementById('fontSizeSelectMenu').value; // Tamaño del texto
    const fillColor = document.getElementById('textColorInput').value;
    if (text) {
      const fabricText = new fabric.IText(text, {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fontSize: parseInt(fontSize),
        fill: fillColor,
        fontFamily: fontFamily,
        fontWeight: fontStyle.includes('bold') ? 'bold' : 'normal',
        fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
        editable: true
      });
  
      canvas.add(fabricText);
      addedTexts.push(fabricText);
      canvas.setActiveObject(fabricText);
      canvas.renderAll();

      debouncedSaveMockup()
    }
  }

// Crear una versión debounced de saveVertices
const debouncedSaveMockup = debounce(saveMockup, 200);

function loadImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            fabric.Image.fromURL(e.target.result, (img) => {
                img.set({
                    left: canvas.width / 4,
                    top: canvas.height / 1.5,
                    scaleX: 0.2,
                    scaleY: 0.2,
                    shadow: new fabric.Shadow({
                        color: 'rgba(0, 0, 0, 0.8)',
                        blur: 10,
                        offsetX: 5,
                        offsetY: 5
                    }),
                    selectable: true,
                    hasControls: true,
                    hasBorders: true
                });
                canvas.add(img);
                canvas.setActiveObject(img);
                canvas.renderAll();
            });
        };
        reader.readAsDataURL(file);
        debouncedSaveMockup()
        customMockupImageLoaded = true;
    }
}

function setupEventListeners() {
    document.getElementById('screenImageBtn').addEventListener('click', () => {
        document.getElementById('screenImage').click();
    });

    document.getElementById('screenImage').addEventListener('change', loadImage);

    // Abrir el menú flotante al hacer clic en "Agregar Texto" (desde el sidebar)
    document.getElementById('addTextBtn').addEventListener('click', (event) => {
        event.stopPropagation();  // Detener la propagación para evitar conflictos
        // Restablecer los valores del input para un nuevo texto
        document.getElementById('textInput').value = '';
        document.getElementById('fontFamilySelectMenu').value = 'Arial';
        document.getElementById('textColorInput').value = '#000000';

        // Mostrar el menú flotante centrado para agregar nuevo texto
        openTextMenu();

        // Configurar el botón para añadir el nuevo texto al canvas
        document.getElementById('addTextToCanvasBtn').innerText = 'Add Text';
        document.getElementById('addTextToCanvasBtn').onclick = function() {
            addTextToCanvas();
        };
    });

    // Cerrar el menú flotante
    document.getElementById('closeTextMenuBtn').addEventListener('click', (event) => {
        event.stopPropagation();  // Detener la propagación en el botón de cerrar
        closeTextMenu();
    });

    // Escuchar la selección de objetos en el canvas
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);

    canvas.on('selection:cleared', function() {
        closeTextMenu();  // Cerrar el menú cuando no hay selección
    });

    // Escuchar la eliminación de objetos con la tecla "Supr"
    document.addEventListener('keydown', handleDeleteKey);
}

// Función para manejar la selección de objetos en el canvas (incluido texto)
function handleObjectSelected(event) {
    // Verificar si hay algún objeto seleccionado
    if (event.selected && event.selected.length > 0) {
        const activeObject = event.selected[0];  // Accedemos al primer objeto seleccionado

        // Detener la propagación del evento a través del DOM y fabric.js

        // Si el objeto es de tipo texto, abrir el menú
        if (activeObject.type === 'i-text') {

            // Cargar las propiedades del texto en el menú flotante
            document.getElementById('textInput').value = activeObject.text;
            document.getElementById('fontFamilySelectMenu').value = activeObject.fontFamily;
            document.getElementById('textColorInput').value = activeObject.fill;

            // Cambiar el botón "Agregar al Canvas" para guardar los cambios en lugar de añadir nuevo texto
            document.getElementById('addTextToCanvasBtn').innerText = 'Save Changes';
            document.getElementById('addTextToCanvasBtn').onclick = function() {
                updateTextOnCanvas(activeObject);
            };
        } else {
            // Si el objeto no es de tipo texto, cerramos el menú
            closeTextMenu();
        }
    }
}

// Listener para el cambio del color del texto
document.getElementById('textColorInput').addEventListener('input', function() {
    const activeObject = canvas.getActiveObject();

    if (activeObject && activeObject.type === 'i-text') {
        // Actualizar el color del texto seleccionado
        activeObject.set({ fill: this.value });
        canvas.renderAll();  // Renderizar el canvas para reflejar el cambio
        debouncedSaveMockup();  // Guardar el mockup después de cambiar el color
    }
});


// Función para actualizar el texto existente con las nuevas propiedades
function updateTextOnCanvas(textObject) {
    textObject.set({
        text: document.getElementById('textInput').value,
        fontFamily: document.getElementById('fontFamilySelectMenu').value,
        fill: document.getElementById('textColorInput').value,  // Actualizar el color del texto
    });

    canvas.renderAll();  // Renderizar el canvas para reflejar los cambios

    // Deseleccionar el texto después de guardar los cambios
    canvas.discardActiveObject();  // Deseleccionar el objeto activo (el texto)
    
    // Ocultar el control de eliminación (gizmo)
    canvas.controlsAboveOverlay = false;
    canvas.renderAll();  // Renderiza nuevamente el canvas para reflejar la deselección

    // Llamar a la función para guardar los cambios después de modificar el texto
    debouncedSaveMockup();

    // Cerrar el menú flotante y restablecer el botón "Agregar al Canvas"
    closeTextMenu();
    document.getElementById('addTextToCanvasBtn').innerText = 'Add to Canvas';
    document.getElementById('addTextToCanvasBtn').onclick = addTextToCanvas;
}

// Función para abrir el menú flotante y cargar las propiedades del texto seleccionado
function openTextMenu() {
    const textMenu = document.getElementById('textMenu');
    textMenu.style.display = 'block';

    // Removemos la lógica de cálculo de posición basada en el objeto del canvas
    // Ahora la posición del menú será fija en la esquina superior derecha
    textMenu.style.position = 'fixed';
    textMenu.style.top = '80px';  // Puedes ajustar el valor si es necesario
}

// Función para ajustar la posición del menú flotante basado en el viewport
function adjustMenuPosition(menuElement, left, top) {
    const rect = menuElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Detectar si el menú se sale de los bordes y ajustarlo dinámicamente

    // Ajuste horizontal (izquierda/derecha)
    if (rect.right > viewportWidth) {
        // Si el menú se sale por la derecha, ajustarlo hacia la izquierda
        menuElement.style.left = `${viewportWidth - rect.width - 20}px`;
    } else if (rect.left < 0) {
        // Si se sale por la izquierda, ajustarlo hacia la derecha
        menuElement.style.left = '20px';
    }

    // Ajuste vertical (arriba/abajo)
    if (rect.bottom > viewportHeight) {
        // Si el menú se sale por la parte inferior, ajustarlo hacia arriba
        menuElement.style.top = `${viewportHeight - rect.height - 20}px`;
    } else if (rect.top < 0) {
        // Si se sale por la parte superior, ajustarlo hacia abajo
        menuElement.style.top = '20px';
    }

    // Asegurarse de que el menú no esté directamente encima del texto
    const padding = 10;  // Un poco de espacio entre el texto y el menú
    if (top + rect.height + padding > viewportHeight) {
        // Si el menú se superpone al texto por debajo, ajustarlo hacia arriba
        menuElement.style.top = `${top - rect.height - padding}px`;
    } else {
        // Asegurarse de que haya suficiente espacio debajo del texto
        menuElement.style.top = `${top + padding}px`;
    }
}

// Función para cerrar el menú flotante de agregar texto
function closeTextMenu() {
    const textMenu = document.getElementById('textMenu');
    textMenu.style.display = 'none';
}

// Detectar clics fuera del menú para cerrarlo
document.addEventListener('click', function(event) {
    const textMenu = document.getElementById('textMenu');
    const addTextBtn = document.getElementById('addTextBtn');  // Botón para abrir el menú
    const closeTextMenuBtn = document.getElementById('closeTextMenuBtn');  // Botón para cerrar
    const canvasWrapper = document.querySelector('.canvas-container');  // Canvas container

    // Solo cerrar el menú si el clic no fue en el propio menú, el canvas o en los botones de interacción
    if (
        textMenu.style.display === 'block' &&
        !textMenu.contains(event.target) &&
        !canvasWrapper.contains(event.target) &&  // Asegurarse que no fue en el canvas
        event.target !== addTextBtn &&  // Asegurarse que no fue en el botón de agregar texto
        event.target !== closeTextMenuBtn // Asegurarse que no fue en el botón de cerrar
    ) {
        closeTextMenu();  // Cerrar el menú si se hace clic fuera de él
    }
});

// Función para agregar el texto al canvas con las propiedades seleccionadas
function addTextToCanvas() {
    const text = document.getElementById('textInput').value;
    const fontFamily = document.getElementById('fontFamilySelectMenu').value;
    const fillColor = document.getElementById('textColorInput').value;

    if (text) {
        const fabricText = new fabric.IText(text, {
            left: isDesktop ? canvas.width / 4 : canvas.width / 1.5,
            top: canvas.height / 1.5,
            fontSize: 100,
            fill: fillColor,
            fontFamily: fontFamily,
            editable: true,
        });

        canvas.add(fabricText);
        addedTexts.push(fabricText);
        canvas.setActiveObject(fabricText);
         // Forzar la reconfiguración de la imagen de fondo si es necesario
        if (canvas.backgroundImage) {
            canvas.setBackgroundImage(canvas.backgroundImage, canvas.renderAll.bind(canvas));
        } else {
            canvas.renderAll();
        }

        // Guardar el mockup después de añadir el texto
        debouncedSaveMockup();

        // Cerrar el menú flotante después de agregar el texto
        closeTextMenu();
    }
}

// Definir la función que crea el control personalizado de eliminación
function defineDeleteControl() {
    fabric.Object.prototype.controls.deleteControl = new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -16,
        cursorStyle: 'pointer',
        mouseUpHandler: deleteObjectHandler,
        render: renderDeleteIcon,
        cornerSize: 24
    });
}

function defineEditControl() {
    fabric.Object.prototype.controls.editControl = new fabric.Control({
        x: -0.5,  // Posición del botón a la izquierda
        y: -0.5,  // Posición del botón arriba
        offsetY: -16,
        cursorStyle: 'pointer',
        mouseUpHandler: openTextMenuFromControl,  // Al hacer clic, abre el menú de edición
        render: renderEditIcon,  // Función para renderizar el icono de edición
        cornerSize: 24
    });
}

// Función que se ejecuta cuando el usuario hace clic en el control de edición
function openTextMenuFromControl(eventData, transform) {
    const target = transform.target;  // El objeto de texto al que está asociado el control

    // Si el objeto es de tipo texto, abrir el menú de edición
    if (target && target.type === 'i-text') {
        document.getElementById('textInput').value = target.text;
        document.getElementById('fontFamilySelectMenu').value = target.fontFamily;
        document.getElementById('textColorInput').value = target.fill;

        openTextMenu();  // Abrir el menú de edición de texto
    }
}

// Función para renderizar el icono de edición en el canvas
function renderEditIcon(ctx, left, top, styleOverride, fabricObject) {
    const img = document.createElement('img');
    img.src = 'https://cdn-icons-png.flaticon.com/512/1159/1159633.png';  // URL del ícono de edición
    img.onload = function () {
        ctx.drawImage(img, left - 12, top - 12, 24, 24);  // Dibujar el icono en la posición deseada
    };
}

// Función que se ejecuta cuando el usuario hace clic en el control de eliminar
function deleteObjectHandler(eventData, transform) {
    const target = transform.target;
    const canvas = target.canvas;

    // Si el objeto eliminado es una imagen
    if (target.type === 'image') {
        if (target === canvas.getActiveObject()) {
            customMockupImageLoaded = false;
        }
    }

    // Verificar si el objeto eliminado es un texto
    if (target.type === 'i-text') {
        // Eliminar el texto del array addedTexts
        addedTexts = addedTexts.filter(text => text !== target);
    }

    debouncedSaveMockup();  // Guardar el mockup

    canvas.remove(target);
    canvas.requestRenderAll();
}


// Función para renderizar el ícono de eliminar en el canvas
function renderDeleteIcon(ctx, left, top, styleOverride, fabricObject) {
    const img = document.createElement('img');
    img.src = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';  // URL de un ícono de eliminar
    img.onload = function () {
        ctx.drawImage(img, left - 12, top - 12, 24, 24);
    };
}

// Función para manejar la tecla de borrar (DEL)
function handleDeleteKey(event) {
    if (event.key === 'Delete' || event.key === 'Del') {
        const activeObject = canvas.getActiveObject();
        if (activeObject) {
            canvas.remove(activeObject);
            canvas.renderAll();
            debouncedSaveMockup()
        }
    }
}

function saveMockup() {
    const formData = new FormData();
    formData.append('uuid', uuid);

    
    // Adjuntar la imagen de fondo actual
    if (typeof newBackgroundImageLoaded === 'object') {
        console.warn('Se detectó un evento en lugar de la URL de fondo.');
    }
    if (newBackgroundImageLoaded !== null) {
        formData.append('background_image', backgroundImage || 'bg.jpg');
    }
    
    // Obtener el nivel de zoom y la posición de la cámara
    const zoomLevel = canvas.getZoom();
    const panX = canvas.viewportTransform[4];
    const panY = canvas.viewportTransform[5];

    if (isNaN(zoomLevel) || isNaN(panX) || isNaN(panY)) {
        console.error('Error al obtener el nivel de zoom y la posición de la cámara.');
        return;
    } else {
        formData.append('zoom_level', zoomLevel);
        formData.append('pan_x', panX);
        formData.append('pan_y', panY);
    }

    
    // Si hay una nueva imagen de pantalla cargada, adjuntarla
    if (customMockupImageLoaded) {
        const screenInput = document.getElementById('screenImage');
        if (screenInput.files.length > 0) {
            formData.append('screen_image', screenInput.files[0]);
        } else if (originalImage) {
            formData.append('screen_image', originalImage.src);
        }
        formData.append('customMockupImageLoaded', 'true');
    } else {
        // Si se eliminó la imagen, enviamos null
        formData.append('screen_image', null);
        formData.append('customMockupImageLoaded', 'false');
    }
    
    // Verificar si el objeto activo es una imagen
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.type === 'image') {
        size = {
            width: activeObject.getScaledWidth(),
            height: activeObject.getScaledHeight(),
        };
        position = {
            left: activeObject.left,
            top: activeObject.top,
        };
    }

    // Si no hay un objeto activo de tipo imagen, usamos los valores de size y position previos
    if (size && position) {
        formData.append('size', JSON.stringify(size));
        formData.append('position', JSON.stringify(position));
    }

    const productId = new URLSearchParams(window.location.search).get('p_cat_id');
    if (productId) {
        formData.append('product_id', productId);
    }

    const textsData = addedTexts.map(text => ({
        content: text.text,
        left: text.left,
        top: text.top,
        fontSize: text.fontSize,
        fontFamily: text.fontFamily,
        fill: text.fill,
        angle: text.angle,
        scaleX: text.scaleX,
        scaleY: text.scaleY
    }));
    
    formData.append('texts', JSON.stringify(textsData));

    formData.append('selected_color', document.getElementById('colorselect').value);
    formData.append('selected_size', document.getElementById('sizeselect').value);
    fetch('main.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
        } else {
            console.error('Error al guardar el mockup:', data.error);
        }
    })
    .catch(error => {
        console.error('Error en la solicitud:', error);
    });
}

async function generateCompositeImage() {
    const backgroundImage = canvas.backgroundImage;

    if (!backgroundImage) {
        console.error('No hay imagen de fondo en el canvas.');
        return;
    }

    // Obtener las dimensiones escaladas de la imagen de fondo
    const bgWidth = backgroundImage.width * backgroundImage.scaleX;
    const bgHeight = backgroundImage.height * backgroundImage.scaleY;
    const bgLeft = backgroundImage.left || 0;
    const bgTop = backgroundImage.top || 0;

    // Crear un nuevo canvas temporal con el tamaño de la imagen de fondo
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bgWidth;
    tempCanvas.height = bgHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Dibujar la imagen de fondo en el canvas temporal
    const bgImgElement = new Image();
    bgImgElement.src = backgroundImage._element.src;
    await new Promise((resolve) => {
        bgImgElement.onload = resolve;
    });

    tempCtx.drawImage(
        bgImgElement,
        0, 0,  // Dibujar en la esquina superior izquierda del nuevo canvas
        bgWidth, bgHeight
    );

    // Crear un nuevo canvas de Fabric para los demás objetos (logo, textos, etc.)
    const tempFabricCanvas = new fabric.StaticCanvas(null, {
        width: bgWidth,
        height: bgHeight
    });

    // Agregar todos los objetos del canvas excepto la imagen de fondo
    const clonedObjects = canvas.getObjects().filter(obj => obj !== backgroundImage).map(obj => {
        const clone = fabric.util.object.clone(obj);
        clone.set({
            left: obj.left - bgLeft,
            top: obj.top - bgTop
        });
        return clone;
    });

    clonedObjects.forEach(obj => tempFabricCanvas.add(obj));
    tempFabricCanvas.renderAll();

    // Dibujar los objetos del canvas de Fabric en el canvas temporal
    const tempObjectsDataURL = tempFabricCanvas.toDataURL({ format: 'png' });
    const tempObjectsImg = new Image();
    tempObjectsImg.src = tempObjectsDataURL;

    await new Promise((resolve) => {
        tempObjectsImg.onload = resolve;
    });

    tempCtx.drawImage(tempObjectsImg, 0, 0);

    // Obtener el DataURL del canvas compuesto
    const finalDataURL = tempCanvas.toDataURL({
        format: 'png',
        multiplier: 2  // Duplicar la resolución para una mejor calidad
    });

    return finalDataURL;
}

function loadFonts(fontsArray) {
    const fontPromises = fontsArray.map(fontName => {
        const font = fonts.find(f => f.name === fontName);
        if (font) {
            const fontFace = new FontFace(font.name, `url(fonts/${font.file})`);
            return fontFace.load().then(loadedFontFace => {
                document.fonts.add(loadedFontFace);
            }).catch(error => {
                console.error(`Error al cargar la fuente ${font.name}:`, error);
            });
        } else {
            console.warn(`Fuente ${fontName} no encontrada. Usando fuente por defecto.`);
            return Promise.resolve();
        }
    });

    return Promise.all(fontPromises);
}

function loadInitialData(data) {
    if (data.screen_image) {
        loadImageFromURL(data);
        customMockupImageLoaded = true
    }

    if (data.background_image && data.background_image !== 'bg.jpg') {
        setCanvasBackground(data.background_image);
        currentBackgroundId = data.background_image;
        if (data.product_id) {
            productId = data.product_id; // Actualizar productId
        }
    } else if (data.product_id) {
        const productCard = document.querySelector(`.product-card[data-id="${data.product_id}"]`);
        if (productCard) {
            currentProductName = productCard.getAttribute('data-name');
            currentProductPrice = parseFloat(productCard.getAttribute('data-price')) || 0;
            const imageUrl = productCard.getAttribute('data-image');
            setCanvasBackground(imageUrl);
            currentBackgroundId = imageUrl;
            productId = data.product_id; // Actualizar productId
        } else {
            // Si no se encuentra la tarjeta, establecer valores predeterminados
            currentProductName = 'Product Name';
            currentProductPrice = 0;
        }
    } else if (currentProduct && !data.product_id) {
        const productCard = currentProduct;
        if (productCard) {
            const imageUrl = defaultImage; //definida en index.php
            setCanvasBackground(imageUrl);
            currentBackgroundId = imageUrl;
        }

    } else {
        setCanvasBackground('/bg.jpg');
        currentBackgroundId = null;
    }

    // Aplicar el nivel de zoom y la posición de la cámara
    if (data.zoom_level !== 1 && data.pan_x !== 0 && data.pan_y !== 0) {
        console.log(data.zoom_level, data.pan_x, data.pan_y)
        canvas.setZoom(parseFloat(data.zoom_level));
        canvas.viewportTransform[4] = parseFloat(data.pan_x);
        canvas.viewportTransform[5] = parseFloat(data.pan_y);
        canvas.requestRenderAll();
    } else { // default canvas sieze for desktop
        if (isDesktop) {
            canvas.setZoom(0.5)
            canvas.viewportTransform[4] = parseFloat(605.0);
            canvas.viewportTransform[5] = parseFloat(10.5);
            canvas.requestRenderAll();
        } else {
            canvas.setZoom(0.5)
            canvas.viewportTransform[4] = parseFloat(-80.0);
            canvas.viewportTransform[5] = parseFloat(10.5);
            canvas.requestRenderAll();
        }
    }

    
    if (data.texts) {
        const textsData = JSON.parse(data.texts);
        const fontsToLoad = new Set();
    
        textsData.forEach(textData => {
            fontsToLoad.add(textData.fontFamily);
        });
    
        // Convertir el Set a Array
        const fontsArray = Array.from(fontsToLoad);
         // Ahora cargamos las fuentes antes de crear los textos
        loadFonts(fontsArray).then(() => {
            // Una vez que las fuentes estén cargadas, podemos crear los textos
            textsData.forEach(textData => {
                const fabricText = new fabric.IText(textData.content, {
                    left: textData.left,
                    top: textData.top,
                    fontSize: textData.fontSize,
                    fontFamily: textData.fontFamily,
                    fill: textData.fill,
                    angle: textData.angle,
                    scaleX: textData.scaleX,
                    scaleY: textData.scaleY,
                    editable: true
                });

                canvas.add(fabricText);
                addedTexts.push(fabricText);
            });

            canvas.renderAll(); // Renderizar el canvas después de agregar los textos
        });
    }

    // Restaurar color seleccionado
    if (data.selected_color) {
        document.getElementById('colorselect').value = data.selected_color;

        // Marcar el botón de color seleccionado
        const colorButtons = document.querySelectorAll('.color-button');
        colorButtons.forEach(button => {
            if (button.getAttribute('data-color') === data.selected_color) {
                button.classList.add('selected');
            }
        });

        // Actualizar el color de previsualización con el código hexadecimal correspondiente
        updateColorPreview(productId, data.selected_color);
    }

    // Restaurar talla seleccionada
    if (data.selected_size) {
        document.getElementById('sizeselect').value = data.selected_size;
    }

    // Poblar campos adicionales si existen
    if (data.quantity) {
        document.getElementById('quantity').value = data.quantity;
    }
    if (data.inks_front) {
        document.getElementById('front').value = data.inks_front;
    }
    if (data.inks_back) {
        document.getElementById('back').value = data.inks_back;
    }
    if (data.zip_code) {
        document.getElementById('zipcode').value = data.zip_code;
    }
    if (data.total_price) {
        document.getElementById('totalPrice').innerText = parseFloat(data.total_price).toFixed(2);
    }

    // Después de restaurar, verificar si ambos están seleccionados
    checkIfColorAndSizeSelected();
}

// Nueva función para actualizar el previsualizador de color
function updateColorPreview(productId, selectedColor) {
    // Hacemos una petición para obtener los colores con sus códigos
    fetch('product_color_handler.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `action=getColors&product_id=${productId}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.msg === 'yes') {
            // Buscamos el código de color que coincida con el nombre del color seleccionado
            const colorData = data.colors.find(colorObj => colorObj.color === selectedColor);
            if (colorData) {
                const colorCode = colorData.colorcode;
                document.getElementById('colorPreview').style.backgroundColor = `#${colorCode}`;
            }
        }
    })
    .catch(error => console.error('Error al obtener el color:', error));
}

function loadImageFromURL(data) {
    originalImage = new Image();
    originalImage.src = data.screen_image;
    fabric.Image.fromURL(data.screen_image, (img) => {
        size = JSON.parse(data.size);
        position = JSON.parse(data.position);

        img.set({
            left: position?.left || 0,
            top: position?.top || 0,
            scaleX: (size?.width || 200) / img.width,
            scaleY: (size?.height || 200) / img.height,
            selectable: true,
            hasControls: true,
            hasBorders: true
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        // Añadir evento para guardar el mockup al mover la imagen
        img.on('modified', debouncedSaveMockup);

        customMockupImageLoaded = true;
    });
}