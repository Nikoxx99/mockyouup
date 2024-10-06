// Variables globales
let canvas, screen, controlPoints = [], points, glfxCanvas, originalImage, transformedImage, mockupGroup;
let uuid = new URLSearchParams(window.location.search).get('uuid') || generateUUID();
let screenImageSelected = false;
let backgroundImage = 'bg.jpg';
let newImageLoaded = false;
let currentBackgroundId = null;
let addedTexts = [];
let isPerspectiveMode = false;
let productId = null;

// Función para generar UUID (si no está disponible en el lado del servidor)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
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

document.addEventListener('DOMContentLoaded', function() {
    var productCards = document.querySelectorAll('.product-card');
    var getQuoteBtn = document.getElementById('getQuoteBtn');

    productCards.forEach(function(card) {
        card.addEventListener('click', function() {
            // Obtener el ID del producto seleccionado
            productId = card.getAttribute('data-id');

            // Actualizar la URL con el parámetro p_cat_id
            var currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('p_cat_id', productId);
            window.history.pushState({}, '', currentUrl);

            // Verificar si se han seleccionado color y talla
            checkIfColorAndSizeSelected();
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    setupEventListeners();
    defineDeleteControl();

    const urlParams = new URLSearchParams(window.location.search);
    productId = urlParams.get('p_cat_id');  // Obtener el p_cat_id de la URL

    if (initialData) {
        loadInitialData(initialData);

        // Actualizar productId si no está definido
        if (!productId && initialData.product_id) {
            productId = initialData.product_id;
        }
    }

    // Si hay un productId, cargar los colores sin cambiar el fondo
    if (productId) {
        fetchProductColorsAndPopulate(productId);
    }

    // Añadir event listeners a las tarjetas de productos
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', handleProductCardClick);
    });
});

// Función para verificar si se han seleccionado color y talla
function checkIfColorAndSizeSelected() {
    const selectedColor = document.getElementById('colorselect').value;
    const selectedSize = document.getElementById('sizeselect').value;
    const getQuoteBtn = document.getElementById('getQuoteBtn');

    if (selectedColor && selectedSize && productId) {
        getQuoteBtn.disabled = false;
        getQuoteBtn.onclick = async function() {
            // Agregar al carrito
            
            // Generar y guardar la imagen compuesta
            const dataURL = await generateCompositeImage();
            const image = await saveCompositeImage(dataURL);
            AddToCart('shopping_cart', productId, 1, 'top_cart', 'cartToast', rand, image);
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
                console.log('Imagen compuesta guardada correctamente.');
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
    const imageUrl = card.getAttribute('data-image');  // Imagen por defecto del producto
    productId = card.getAttribute('data-id');

    if (currentBackgroundId === productId) {
        // Si se hace clic en la misma tarjeta, volver al fondo por defecto
        setCanvasBackground('bg.jpg').then(() => {
            currentBackgroundId = null;
            debouncedSaveVertices('bg.jpg');
        });
    } else {
        // Cambiar el fondo al de la tarjeta seleccionada (imagen por defecto)
        setCanvasBackground(imageUrl).then(() => {
            console.log('Fondo cambiado a:', imageUrl);
            debouncedSaveVertices(imageUrl);  // Asegurarse de que se guarde la URL completa de la imagen

            // **Después** de cambiar el fondo, popular los colores
            fetchProductColorsAndPopulate(productId);
        });
    }
}

// Función para obtener los colores del producto y popular los selectores
function fetchProductColorsAndPopulate(productId) {
    // Realiza una petición AJAX para obtener los colores disponibles para el producto
    fetch('product_color_handler.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `action=getColors&product_id=${productId}`
    })
    .then(response => response.text()) // Cambiamos a .text() para ver la respuesta cruda
    .then(data => {
        try {
            const jsonData = JSON.parse(data);  // Intentamos convertirlo a JSON
            if (jsonData.msg === 'yes') {
                // Popular los colores en el contenedor de botones de color
                populateColorOptions(jsonData.colors);

                // **Mover la lógica aquí**: añadir los event listeners justo después de generar los botones
                addColorButtonListeners(productId);
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
function addColorButtonListeners(productId) {
    document.querySelectorAll('.color-button').forEach(button => {
        button.addEventListener('click', function() {
            const selectedColor = button.getAttribute('data-color');
            
            // Actualizar el input oculto con el color seleccionado
            document.getElementById('colorselect').value = selectedColor;
            
            // Cambiar la imagen del producto según el color seleccionado
            updateProductImageWithColor(productId, selectedColor);

            // Guardar color y talla
            debouncedSaveVertices();

            // Verificar si se han seleccionado ambos
            checkIfColorAndSizeSelected();
        });
    });
}

// Listener para el selector de tallas
document.getElementById('sizeselect').addEventListener('change', function() {
    // Guardar color y talla
    debouncedSaveVertices();

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
        colorButton.style.backgroundColor = `#${colorObj.colorcode}`;
        colorButton.setAttribute('data-color', colorObj.color);
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
        body: `action=getImageByColor&product_id=${productId}&color=${color}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.msg === 'yes') {
            // Cambiar la imagen de fondo según el color seleccionado
            setCanvasBackground(`/${data.image}`).then(() => {
                currentBackgroundId = `/${data.image}`;
                console.log('Imagen actualizada con el color seleccionado:', color);

                // Asegurarse de guardar esta nueva imagen en la base de datos
                debouncedSaveVertices(currentBackgroundId);  // Guardar la nueva imagen seleccionada
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
            const canvasAspect = canvas.width / canvas.height;
            const imgAspect = img.width / img.height;
            let scaleX, scaleY, left, top;

            if (canvasAspect > imgAspect) {
                // El canvas es más ancho que la imagen
                scaleX = canvas.width / img.width;
                scaleY = scaleX;
                left = 0;
                top = (canvas.height - (img.height * scaleY)) / 2;
            } else {
                // El canvas es más alto que la imagen
                scaleY = canvas.height / img.height;
                scaleX = scaleY;
                top = 0;
                left = (canvas.width - (img.width * scaleX)) / 2;
            }

            img.set({
                scaleX: scaleX,
                scaleY: scaleY,
                left: left,
                top: top,
                originX: 'left',
                originY: 'top'
            });

            canvas.setBackgroundImage(img, () => {
                canvas.renderAll();
                resolve(); // Resolvemos la Promise cuando el fondo se haya cambiado
            });
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

    window.addEventListener('resize', resizeCanvas);
    glfxCanvas = fx.canvas();

    createPcScreen();
    updateScreenControls();

    // Añadir eventos para mantener los puntos de control al frente
    canvas.on('selection:updated', bringControlPointsToFront);
    canvas.on('object:moved', bringControlPointsToFront);
}

function resizeCanvas() {
    const canvasContainer = document.querySelector('.canvas-container');
    const containerWidth = canvasContainer.offsetWidth;
    const containerHeight = canvasContainer.offsetHeight;

    canvas.setWidth(containerWidth);
    canvas.setHeight(containerHeight);
    canvas.renderAll();
}

function createPcScreen() {
  if (screen) {
      canvas.remove(screen);
  }

  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Usar los datos guardados si están disponibles, de lo contrario usar valores por defecto
  let screenSize = initialData.size ? JSON.parse(initialData.size) : { width: 200, height: 200 };
  let screenPosition = initialData.position ? JSON.parse(initialData.position) : { left: canvasWidth * 0.25, top: canvasHeight * 0.2 };

  points = [
      { x: screenPosition.left, y: screenPosition.top },
      { x: screenPosition.left + screenSize.width, y: screenPosition.top },
      { x: screenPosition.left + screenSize.width, y: screenPosition.top + screenSize.height },
      { x: screenPosition.left, y: screenPosition.top + screenSize.height }
  ];

  screen = new fabric.Polygon(points, {
      fill: 'transparent',
      stroke: '#ffb199',
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      objectCaching: false,
      hoverCursor: 'move',
      excludeFromExport: true
  });

  screen.on('moving', updateScreenPosition);
  screen.on('scaling', updateScreenPosition);
  screen.on('rotating', updateScreenPosition);

  canvas.add(screen);
  updateScreenControls();
}

function addTextToCanvas() {
    const text = prompt("Ingrese el texto que desea agregar:");
    if (text) {
      const fabricText = new fabric.IText(text, {
        left: canvas.width / 2,
        top: canvas.height / 2,
        fontSize: 20,
        fill: '#000000',
        fontFamily: 'Arial',
        editable: true
      });
  
      canvas.add(fabricText);
      addedTexts.push(fabricText);
      canvas.setActiveObject(fabricText);
      canvas.renderAll();
  
      // Agregar eventos para manejar la perspectiva del texto
      fabricText.on('moving', updateTextPerspective);
      fabricText.on('scaling', updateTextPerspective);
      fabricText.on('rotating', updateTextPerspective);

      debouncedSaveVertices()
    }
  }
  
  function updateTextPerspective(event) {
    const text = event.target;
    if (isPerspectiveMode) {
      applyPerspectiveToText(text);
    }
    debouncedSaveVertices();
  }
  
  function applyPerspectiveToText(text) {
    const matrix = getPerspectiveMatrix();
    text.set('transformMatrix', matrix);
    canvas.renderAll();
  }
  
  function getPerspectiveMatrix() {
    const source = [
      {x: 0, y: 0},
      {x: screen.width, y: 0},
      {x: screen.width, y: screen.height},
      {x: 0, y: screen.height}
    ];
    
    return fabric.util.getTransformMatrix({
      points: source,
      bounds: points,
      widthFactor: 1,
      heightFactor: 1
    });
  }
  

function updateScreenControls() {
  if (isPerspectiveMode) {
      screen.set({
          hasControls: false,
          hasBorders: false,
      });

      if (controlPoints.length > 0) {
          controlPoints.forEach(point => canvas.remove(point));
      }

      controlPoints = points.map((point, index) => {
          let circle = new fabric.Circle({
              left: point.x,
              top: point.y,
              strokeWidth: 2,
              radius: 10,
              fill: '#ffffff',
              stroke: '#e6e6e6',
              originX: 'center',
              originY: 'center',
              hasBorders: false,
              hasControls: false,
              selectable: true,
              hoverCursor: 'pointer',
              excludeFromExport: true
          });

          circle.on('moving', function(e) {
              updatePolygonPoint(index, this.left, this.top);
          });

          circle.on('mouseup', handleControlPointChange);
          circle.on('touchend', handleControlPointChange);

          canvas.add(circle);
          return circle;
      });
  } else {
      screen.set({
          hasControls: true,
          hasBorders: true,
      });

      if (controlPoints.length > 0) {
          controlPoints.forEach(point => canvas.remove(point));
          controlPoints = [];
      }
  }

  canvas.renderAll();
}


function bringControlPointsToFront() {
  controlPoints.forEach((circle) => {
      circle.bringToFront(); // Mantener los puntos de control al frente
  });
  canvas.renderAll(); // Renderizar los cambios
}

// Crear una versión debounced de saveVertices
const debouncedSaveVertices = debounce(saveVertices, 500);

function updateScreenPosition(e) {
  const polygon = e.transform ? e.transform.target : null;

  if (!(polygon instanceof fabric.Polygon)) {
      console.error('Objeto de polígono inválido');
      return;
  }

  // Actualizar puntos basados en la nueva posición y escala del polígono
  const matrix = polygon.calcTransformMatrix();
  points = polygon.points.map(point => {
      const xy = fabric.util.transformPoint({
          x: point.x - polygon.pathOffset.x,
          y: point.y - polygon.pathOffset.y
      }, matrix);
      return { x: xy.x, y: xy.y };
  });

  // Actualizar posición de los puntos de control
  controlPoints.forEach((circle, index) => {
      circle.set({
          left: points[index].x,
          top: points[index].y
      });
      circle.setCoords();
  });

  // Renderizar los cambios
  canvas.renderAll();

  // Aplicar la perspectiva con debounce
  debouncedUpdatePerspective();

  // Guardar la imagen y vértices con debounce
  debouncedSaveVertices();
}


// Actualizar las coordenadas de un vértice específico
function updatePolygonPoint(index, x, y) {
  points[index] = { x, y };

  // Actualizar el polígono con los nuevos puntos
  screen.set({ points: points });

  // Asegurarnos de que el polígono y los puntos de control se actualicen correctamente
  controlPoints.forEach((circle, idx) => {
      // Actualizamos las coordenadas visuales e internas
      circle.set({
          left: points[idx].x,
          top: points[idx].y
      });
      circle.setCoords(); // Actualizar los límites del punto de control
  });

  screen.setCoords(); // Asegurar que las coordenadas del polígono se actualicen

  // Renderizar los cambios en el canvas
  canvas.renderAll();

  // Actualizar la perspectiva con debounce
  debouncedUpdatePerspective();
}

function loadImage(event) {
  const file = event.target.files[0];
  if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
          originalImage = new Image();
          originalImage.onload = () => {
              applyPerspectiveToImage();
              screenImageSelected = true;
              newImageLoaded = true;  // Marcar que se ha cargado una nueva imagen
              debouncedSaveVertices();
          };
          originalImage.src = e.target.result;
      };
      reader.readAsDataURL(file);
  }
}

function applyPerspectiveToImage() {
    if (!originalImage || !Array.isArray(points)) return;

    const bounds = getPolygonBounds();
    const width = bounds.width;
    const height = bounds.height;

    glfxCanvas.width = width;
    glfxCanvas.height = height;

    const texture = glfxCanvas.texture(originalImage);
    glfxCanvas.draw(texture).perspective(
        [0, 0, originalImage.width, 0, originalImage.width, originalImage.height, 0, originalImage.height],
        [
            points[0].x - bounds.left, points[0].y - bounds.top,
            points[1].x - bounds.left, points[1].y - bounds.top,
            points[2].x - bounds.left, points[2].y - bounds.top,
            points[3].x - bounds.left, points[3].y - bounds.top
        ]
    ).update();

    const dataURL = glfxCanvas.toDataURL('image/png');
    
    if (transformedImage) {
        canvas.remove(transformedImage);
    }

    fabric.Image.fromURL(dataURL, (fImg) => {
        transformedImage = fImg;
        transformedImage.set({
            left: bounds.left,
            top: bounds.top,
            selectable: false,
            evented: false
        });

        canvas.add(transformedImage);
        canvas.sendToBack(transformedImage);
        canvas.renderAll();
    });
}

function getPolygonBounds() {
    const xCoords = points.map(p => p.x);
    const yCoords = points.map(p => p.y);
    const left = Math.min(...xCoords);
    const top = Math.min(...yCoords);
    const right = Math.max(...xCoords);
    const bottom = Math.max(...yCoords);
    return {
        left: left,
        top: top,
        width: right - left,
        height: bottom - top
    };
}

function handleControlPointChange() {
    debouncedUpdatePerspective();
    debouncedSaveVertices();
}

const debouncedUpdatePerspective = debounce(applyPerspectiveToImage, 10);

function saveVertices(newBackgroundImage = backgroundImage) {
    console.log(newBackgroundImage, backgroundImage);
    const formData = new FormData();
    formData.append('uuid', uuid);
    formData.append('vertices', JSON.stringify(points));
    
    const size = {
        width: screen.getScaledWidth(),
        height: screen.getScaledHeight()
    };
    const position = {
        left: screen.left,
        top: screen.top
    };
    formData.append('size', JSON.stringify(size));
    formData.append('position', JSON.stringify(position));
  
    // Adjuntar la imagen de fondo actual
    if (newBackgroundImage !== null) {
        formData.append('background_image', newBackgroundImage || 'bg.jpg');
    }

    const productId = new URLSearchParams(window.location.search).get('p_cat_id');
    if (productId) {
        formData.append('product_id', productId);
    }
  
    // Solo adjuntar la imagen si se ha cargado una nueva
    if (newImageLoaded) {
        const screenInput = document.getElementById('screenImage');
        if (screenInput.files.length > 0) {
            formData.append('screen_image', screenInput.files[0]);
        } else if (originalImage && originalImage.src.startsWith('data:')) {
            formData.append('screen_image', originalImage.src);
        }
        formData.append('new_image_loaded', 'true');
        newImageLoaded = false;  // Resetear la bandera después de guardar
    } else {
        formData.append('new_image_loaded', 'false');
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
            console.log('Mockup guardado correctamente.');
        } else {
            console.error('Error al guardar el mockup:', data.error);
        }
    })
    .catch(error => {
        console.error('Error en la solicitud:', error);
    });
  }

function setupEventListeners() {
    document.getElementById('screenImageBtn').addEventListener('click', () => {
        document.getElementById('screenImage').click();
    });

    //   document.getElementById('saveBtn').addEventListener('click', downloadCompositeImage);

    document.getElementById('screenImage').addEventListener('change', loadImage);

    document.getElementById('perspectiveToggle').addEventListener('change', function() {
        isPerspectiveMode = this.checked;
        updateScreenControls();
    });
    // Abrir el menú flotante al hacer clic en "Agregar Texto"
    document.getElementById('addTextBtn').addEventListener('click', openTextMenu);

    // Agregar el texto al canvas al hacer clic en el botón del menú flotante
    document.getElementById('addTextToCanvasBtn').addEventListener('click', addTextToCanvas);

    // Cerrar el menú flotante
    document.getElementById('closeTextMenuBtn').addEventListener('click', closeTextMenu);

    // Escuchar la selección de objetos en el canvas
    canvas.on('selection:created', handleObjectSelected);
    canvas.on('selection:updated', handleObjectSelected);

    // Escuchar la eliminación de objetos con la tecla "Supr"
    document.addEventListener('keydown', handleDeleteKey);
}

// Función para abrir el menú flotante y cargar las propiedades del texto seleccionado
function handleObjectSelected(event) {
    const activeObject = event.target;

    if (activeObject && activeObject.type === 'i-text') {
        // Cargar las propiedades del texto en el menú flotante
        document.getElementById('textInput').value = activeObject.text;
        document.getElementById('fontFamilySelectMenu').value = activeObject.fontFamily;
        document.getElementById('textColorInput').value = activeObject.fill;

        // Mostrar el menú flotante para editar el texto
        openTextMenu();

        // Cambiar el botón "Agregar al Canvas" para guardar los cambios en lugar de añadir nuevo texto
        document.getElementById('addTextToCanvasBtn').innerText = 'Save Changes';
        document.getElementById('addTextToCanvasBtn').onclick = function() {
            updateTextOnCanvas(activeObject);
        };
    }
}

// Función para actualizar el texto existente con las nuevas propiedades
function updateTextOnCanvas(textObject) {
    textObject.set({
        text: document.getElementById('textInput').value,
        fontFamily: document.getElementById('fontFamilySelectMenu').value,
        fill: document.getElementById('textColorInput').value,
    });

    canvas.renderAll();

    // Llamar a la función para guardar los vértices después de modificar un objeto
    debouncedSaveVertices();

    // Cerrar el menú flotante y restablecer el botón "Agregar al Canvas"
    closeTextMenu();
    document.getElementById('addTextToCanvasBtn').innerText = 'Add to Canvas';
    document.getElementById('addTextToCanvasBtn').onclick = addTextToCanvas;
}

// Función para abrir el menú flotante de agregar texto
function openTextMenu() {
    document.getElementById('textMenu').style.display = 'block';
}

// Función para cerrar el menú flotante de agregar texto
function closeTextMenu() {
    document.getElementById('textMenu').style.display = 'none';
}

// Función para agregar el texto al canvas con las propiedades seleccionadas
function addTextToCanvas() {
    const text = document.getElementById('textInput').value;
    const fontFamily = document.getElementById('fontFamilySelectMenu').value;
    const fillColor = document.getElementById('textColorInput').value;

    if (text) {
        const fabricText = new fabric.IText(text, {
            left: canvas.width / 2,
            top: canvas.height / 2,
            fontSize: 30,
            fill: fillColor,
            fontFamily: fontFamily,
            editable: true,
        });

        canvas.add(fabricText);
        addedTexts.push(fabricText);
        canvas.setActiveObject(fabricText);
        canvas.renderAll();

        // Agregar eventos para manejar la perspectiva del texto
        fabricText.on('moving', updateTextPerspective);
        fabricText.on('scaling', updateTextPerspective);
        fabricText.on('rotating', updateTextPerspective);
    }

    debouncedSaveVertices()
    // Cerrar el menú flotante después de agregar el texto
    closeTextMenu();
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

// Función que se ejecuta cuando el usuario hace clic en el control de eliminar
function deleteObjectHandler(eventData, transform) {
    const target = transform.target;
    console.log('Eliminando objeto:', target);
    const canvas = target.canvas;

    canvas.remove(target);
    canvas.requestRenderAll();
    debouncedSaveVertices()
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
            debouncedSaveVertices()
        }
    }
}

async function generateCompositeImage() {
    // Obtener la imagen de fondo del canvas y sus transformaciones
    const backgroundImage = canvas.backgroundImage;

    // Si no hay imagen de fondo, usamos la imagen por defecto
    if (!backgroundImage) {
        console.error('No hay imagen de fondo en el canvas.');
        return;
    }

    // Obtener las propiedades de transformación de la imagen de fondo
    const bgImgElement = backgroundImage._element;
    const bgScaleX = backgroundImage.scaleX || 1;
    const bgScaleY = backgroundImage.scaleY || 1;
    const bgLeft = backgroundImage.left || 0;
    const bgTop = backgroundImage.top || 0;
    const bgWidth = backgroundImage.width;
    const bgHeight = backgroundImage.height;
    const bgOriginX = backgroundImage.originX || 'left';
    const bgOriginY = backgroundImage.originY || 'top';

    // Crear un nuevo canvas para la composición
    const compositeCanvas = document.createElement('canvas');
    const ctx = compositeCanvas.getContext('2d');

    // Establecer las dimensiones del canvas compuesto iguales al del canvas original
    compositeCanvas.width = canvas.getWidth();
    compositeCanvas.height = canvas.getHeight();

    // Limpiar el canvas
    ctx.clearRect(0, 0, compositeCanvas.width, compositeCanvas.height);

    // Dibujar la imagen de fondo con las mismas transformaciones que en el canvas
    // Calcular la posición real de la imagen de fondo en el canvas compuesto
    let bgDrawX = bgLeft;
    let bgDrawY = bgTop;

    // Si el origen no es 'left' o 'top', necesitamos ajustar la posición
    if (bgOriginX === 'center') {
        bgDrawX -= (bgWidth * bgScaleX) / 2;
    } else if (bgOriginX === 'right') {
        bgDrawX -= bgWidth * bgScaleX;
    }

    if (bgOriginY === 'center') {
        bgDrawY -= (bgHeight * bgScaleY) / 2;
    } else if (bgOriginY === 'bottom') {
        bgDrawY -= bgHeight * bgScaleY;
    }

    // Dibujar la imagen de fondo transformada
    ctx.drawImage(
        bgImgElement,
        0,
        0,
        bgWidth,
        bgHeight,
        bgDrawX,
        bgDrawY,
        bgWidth * bgScaleX,
        bgHeight * bgScaleY
    );

    // Clonar los objetos del canvas original y agregarlos al nuevo canvas de Fabric
    const clonedObjects = canvas.getObjects().filter(obj => !obj.excludeFromExport).map(obj => {
        if (obj === backgroundImage) {
            return null; // Ya hemos dibujado la imagen de fondo
        }
        const clone = fabric.util.object.clone(obj);
        return clone;
    }).filter(obj => obj !== null);

    // Crear un nuevo canvas de Fabric para renderizar los objetos
    const tempCanvas = new fabric.StaticCanvas(null, {
        width: canvas.getWidth(),
        height: canvas.getHeight()
    });

    // Agregar los objetos clonados al nuevo canvas
    clonedObjects.forEach(obj => tempCanvas.add(obj));

    // Renderizar el canvas de Fabric en una imagen
    const tempDataURL = tempCanvas.toDataURL({ format: 'png' });
    const tempImage = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = tempDataURL;
    });

    // Dibujar los objetos del canvas en el canvas compuesto
    ctx.drawImage(tempImage, 0, 0);

    // Obtener la URL de datos de la imagen compuesta
    const dataURL = compositeCanvas.toDataURL('image/png');

    return dataURL;
}

function loadInitialData(data) {
    if (data.vertices) {
        points = JSON.parse(data.vertices);
    }
    if (data.screen_image) {
        loadImageFromURL(data.screen_image);
    }

    if (data.background_image && data.background_image !== 'bg.jpg') {
        setCanvasBackground(data.background_image);
        currentBackgroundId = data.background_image;
        console.log("Cargando imagen de fondo guardada:", data.background_image);
        if (data.product_id) {
            productId = data.product_id; // Actualizar productId
        }
    } else if (data.product_id) {
        const productCard = document.querySelector(`.product-card[data-id="${data.product_id}"]`);
        if (productCard) {
            const imageUrl = productCard.getAttribute('data-image');
            setCanvasBackground(imageUrl);
            currentBackgroundId = imageUrl;
            console.log("Cargando imagen de fondo por defecto del producto:", imageUrl);
            productId = data.product_id; // Actualizar productId
        }
    } else {
        setCanvasBackground('/bg.jpg');
        currentBackgroundId = null;
    }

    if (data.texts) {
        const textsData = JSON.parse(data.texts);
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

            fabricText.on('moving', updateTextPerspective);
            fabricText.on('scaling', updateTextPerspective);
            fabricText.on('rotating', updateTextPerspective);
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
    }

    // Restaurar talla seleccionada
    if (data.selected_size) {
        document.getElementById('sizeselect').value = data.selected_size;
    }

    // Después de restaurar, verificar si ambos están seleccionados
    checkIfColorAndSizeSelected();
}

function loadImageFromURL(url) {
    originalImage = new Image();
    originalImage.onload = () => {
        applyPerspectiveToImage();
        screenImageSelected = true;
    };
    originalImage.src = url;
}