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

new Vue({
  el: '#app',
  data: {
      canvas: null,
      screen: null,
      controlPoints: [],
      points: [
          { x: 300, y: 100 },
          { x: 700, y: 100 },
          { x: 720, y: 400 },
          { x: 280, y: 400 }
      ],
      glfxCanvas: null,
      originalImage: null,
      transformedImage: null,
      debouncedUpdatePerspective: null,
      uuid: null
  },
  created() {
      this.debouncedUpdatePerspective = debounce(this.applyPerspectiveToImage, 100);
  },
  methods: {
      initCanvas() {
          this.canvas = new fabric.Canvas('canvas', {
              width: window.innerWidth,
              height: window.innerHeight
          });
          window.addEventListener('resize', this.resizeCanvas);
          this.glfxCanvas = fx.canvas();
      },
      resizeCanvas() {
          this.canvas.setWidth(window.innerWidth);
          this.canvas.setHeight(window.innerHeight);
          this.canvas.renderAll();
      },
      createPcScreen() {
          if (this.screen) {
              this.canvas.remove(this.screen);
          }

          this.screen = new fabric.Polygon(this.points, {
              fill: 'rgba(200, 200, 200, 0.5)',
              stroke: 'blue',
              strokeWidth: 2,
              selectable: false,
              hasControls: false,
              hasBorders: false,
              objectCaching: false
          });
          this.canvas.add(this.screen);

          if (this.controlPoints.length > 0) {
              this.controlPoints.forEach(point => this.canvas.remove(point));
              this.controlPoints = [];
          }

          this.controlPoints = this.points.map((point, index) => {
              let circle = new fabric.Circle({
                  left: point.x,
                  top: point.y,
                  strokeWidth: 5,
                  radius: 8,
                  fill: '#fff',
                  stroke: '#666',
                  originX: 'center',
                  originY: 'center',
                  hasBorders: false,
                  hasControls: false
              });

              circle.on('moving', () => {
                  this.points[index] = { x: circle.left, y: circle.top };
                  this.screen.set({ points: this.points });
                  this.canvas.renderAll();
              });

              circle.on('mouseup', () => {
                  this.debouncedUpdatePerspective();
                  this.saveVertices();
              });

              circle.on('touchend', () => {
                  this.debouncedUpdatePerspective();
                  this.saveVertices();
              });

              this.canvas.add(circle);
              return circle;
          });

          this.canvas.on('mouse:up', this.debouncedUpdatePerspective);
          this.canvas.on('touch:end', this.debouncedUpdatePerspective);
      },
      loadImage(event) {
          const file = event.target.files[0];
          if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                  this.originalImage = new Image();
                  this.originalImage.onload = () => {
                      this.applyPerspectiveToImage(); // Solo aplicar perspectiva cuando la imagen esté completamente cargada
                  };
                  this.originalImage.src = e.target.result;
              };
              reader.readAsDataURL(file);
          }
      },
      applyPerspectiveToImage() {
          if (!this.originalImage || !Array.isArray(this.points)) return;
      
          const bounds = this.getPolygonBounds();
          const width = bounds.width;
          const height = bounds.height;
      
          this.glfxCanvas.width = width;
          this.glfxCanvas.height = height;
      
          const texture = this.glfxCanvas.texture(this.originalImage);
          this.glfxCanvas.draw(texture).perspective(
              [0, 0, this.originalImage.width, 0, this.originalImage.width, this.originalImage.height, 0, this.originalImage.height],
              [
                  this.points[0].x - bounds.left, this.points[0].y - bounds.top,
                  this.points[1].x - bounds.left, this.points[1].y - bounds.top,
                  this.points[2].x - bounds.left, this.points[2].y - bounds.top,
                  this.points[3].x - bounds.left, this.points[3].y - bounds.top
              ]
          ).update();
      
          const dataURL = this.glfxCanvas.toDataURL('image/png');
          fabric.Image.fromURL(dataURL, (fImg) => {
              if (this.transformedImage) {
                  this.canvas.remove(this.transformedImage);
              }
      
              this.transformedImage = fImg;
              this.transformedImage.set({
                  left: bounds.left,
                  top: bounds.top,
                  selectable: false,
                  evented: false
              });
      
              this.canvas.add(this.transformedImage);
              this.canvas.renderAll();
          });
      },
      getPolygonBounds() {
          const xCoords = this.points.map(p => p.x);
          const yCoords = this.points.map(p => p.y);
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
      },
      fetchVertices() {
          const urlParams = new URLSearchParams(window.location.search);
          this.uuid = urlParams.get('uuid');

          if (!this.uuid) {
              this.uuid = uuid.v4();
              urlParams.set('uuid', this.uuid);
              window.history.replaceState({}, '', `${window.location.pathname}?${urlParams.toString()}`);

              this.saveVertices();
          } else {
            fetch(`/get/${this.uuid}`)
              .then(response => response.json())
              .then(data => {
                  this.points = JSON.parse(data.vertices);
                    if (data.image) {
                        this.loadImageFromURL(data.image);
                    }
                  this.createPcScreen();
              })
              .catch(() => console.error('Error al obtener los vértices.'));
          }
      },
      loadImageFromURL(url) {
          this.originalImage = new Image();
          this.originalImage.onload = () => {
              this.applyPerspectiveToImage(); // Solo aplicar perspectiva cuando la imagen esté completamente cargada
          };
          this.originalImage.src = url;
      },
      saveVertices() {
          if (this.uuid) {
              const formData = new FormData();
              formData.append('uuid', this.uuid);
              formData.append('vertices', JSON.stringify(this.points));

              const fileInput = document.querySelector('input[type="file"]');
              if (fileInput && fileInput.files.length > 0) {
                  formData.append('image', fileInput.files[0]);
              }

              fetch('/save', {
                  method: 'POST',
                  body: formData
              })
              .then(() => console.log('Vértices e imagen guardados correctamente.'))
              .catch(() => console.error('Error al guardar los datos.'));
          }
      }
  },
  mounted() {
      this.initCanvas();
      this.fetchVertices();
  }
});
