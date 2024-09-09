// Variables globales
let canvas, screen, controlPoints = [], points, glfxCanvas, originalImage, transformedImage, mockupGroup;
let uuid = new URLSearchParams(window.location.search).get('uuid') || generateUUID();
let screenImageSelected = false;
let backgroundImage = 'bg.avif';
let newImageLoaded = false;
let currentBackgroundId = null;
let addedTexts = []; // Array para almacenar los objetos de texto agregados

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

document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    setupEventListeners();
    if (initialData) {
        loadInitialData(initialData);
    }

     // Añadir event listeners a las tarjetas de productos
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
        card.addEventListener('click', handleProductCardClick);
    });
});

function handleProductCardClick(event) {
    const card = event.currentTarget;
    const imageUrl = card.getAttribute('data-image');
    const productId = card.getAttribute('data-id');

    if (currentBackgroundId === productId) {
        // Si se hace clic en la misma tarjeta, volver al fondo por defecto
        setCanvasBackground('/bg.jpg');
        currentBackgroundId = null;
        saveVertices('/bg.jpg');
    } else {
        // Cambiar el fondo al de la tarjeta seleccionada
        setCanvasBackground(imageUrl);
        currentBackgroundId = productId;
        console.log('Fondo cambiado a:', imageUrl);
        saveVertices(imageUrl);
    }
}

function setCanvasBackground(imageUrl) {
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

        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
    });
}

let isPerspectiveMode = false;

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
  let screenSize = initialData.size ? JSON.parse(initialData.size) : { width: canvasWidth * 0.6, height: canvasHeight * 0.6 };
  let screenPosition = initialData.position ? JSON.parse(initialData.position) : { left: canvasWidth * 0.2, top: canvasHeight * 0.2 };

  points = [
      { x: screenPosition.left, y: screenPosition.top },
      { x: screenPosition.left + screenSize.width, y: screenPosition.top },
      { x: screenPosition.left + screenSize.width, y: screenPosition.top + screenSize.height },
      { x: screenPosition.left, y: screenPosition.top + screenSize.height }
  ];

  screen = new fabric.Polygon(points, {
      fill: 'transparent',
      stroke: '#e6e6e6',
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      objectCaching: false,
      hoverCursor: 'move'
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
              hoverCursor: 'pointer'
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

function saveVertices() {
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
    formData.append('background_image', currentBackgroundId || '/bg.jpg');
  
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

  document.getElementById('saveBtn').addEventListener('click', downloadCompositeImage);

  document.getElementById('screenImage').addEventListener('change', loadImage);

  document.getElementById('perspectiveToggle').addEventListener('change', function() {
      isPerspectiveMode = this.checked;
      updateScreenControls();
  });
  document.getElementById('addTextBtn').addEventListener('click', addTextToCanvas);
}


function downloadCompositeImage() {
    // Determinar qué imagen de fondo usar
    let backgroundImg;
    if (canvas.backgroundImage) {
        // Si hay una imagen de fondo en el canvas (imagen de card seleccionada), usarla
        backgroundImg = canvas.backgroundImage._element;
    } else {
        // Si no, usar la imagen de fondo por defecto
        backgroundImg = document.getElementById('backgroundImage');
    }

    // Obtener las dimensiones reales de la imagen de fondo
    const imgWidth = backgroundImg.naturalWidth;
    const imgHeight = backgroundImg.naturalHeight;

    // Crear un nuevo canvas para la composición
    const compositeCanvas = document.createElement('canvas');
    const ctx = compositeCanvas.getContext('2d');

    // Establecer las dimensiones del canvas compuesto para que coincidan con la imagen de fondo
    compositeCanvas.width = imgWidth;
    compositeCanvas.height = imgHeight;

    // Dibujar la imagen de fondo en su tamaño original
    ctx.drawImage(backgroundImg, 0, 0, imgWidth, imgHeight);

    // Crear una copia temporal del canvas principal sin los controles
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    // Ocultar temporalmente los elementos que no queremos en la imagen final
    const originalControlsVisibility = screen.get('visible');
    screen.set('visible', false);
    controlPoints.forEach(point => point.set('visible', false));

    // Renderizar solo los objetos visibles en el canvas temporal
    canvas.getObjects().forEach(obj => {
        if (obj.visible) {
        obj.render(tempCtx);
        }
    });

    // Restaurar la visibilidad de los elementos
    screen.set('visible', originalControlsVisibility);
    controlPoints.forEach(point => point.set('visible', true));

    // Calcular la escala para ajustar el contenido del canvas al tamaño de la imagen de fondo
    const scaleX = imgWidth / canvas.width;
    const scaleY = imgHeight / canvas.height;

    // Dibujar el contenido del canvas temporal en el canvas compuesto, ajustando la escala
    ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height, 0, 0, imgWidth, imgHeight);

    // Convertir el canvas a una URL de datos
    const dataURL = compositeCanvas.toDataURL('image/png');

    // Crear un enlace de descarga
    const downloadLink = document.createElement('a');
    downloadLink.href = dataURL;
    downloadLink.download = 'mockup_composite.png';

    // Simular un clic en el enlace para iniciar la descarga
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function loadInitialData(data) {
    if (data.vertices) {
        points = JSON.parse(data.vertices);
    }
    if (data.screen_image) {
        loadImageFromURL(data.screen_image);
    }
    if (data.background_image) {
        setCanvasBackground(data.background_image);
        currentBackgroundId = data.background_image;
    } else {
        setCanvasBackground('/bg.jpg');
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
}

function loadImageFromURL(url) {
    originalImage = new Image();
    originalImage.onload = () => {
        applyPerspectiveToImage();
        screenImageSelected = true;
    };
    originalImage.src = url;
}