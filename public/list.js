// Función para cargar las UUIDs desde el servidor
function loadUUIDs() {
  fetch('/uuids')
      .then(response => response.json())
      .then(uuids => {
          const uuidList = document.getElementById('uuid-list');
          uuids.forEach(uuid => {
              const li = document.createElement('li');
              li.textContent = uuid;
              li.onclick = () => {
                  window.location.href = `/index.html?uuid=${uuid}`;
              };
              uuidList.appendChild(li);
          });
      })
      .catch(error => {
          console.error('Error al cargar las UUIDs:', error);
      });
}

// Cargar las UUIDs cuando la página esté lista
document.addEventListener('DOMContentLoaded', loadUUIDs);
