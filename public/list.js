// Función para cargar las UUIDs desde el servidor
function loadMockups() {
    fetch('/uuids')
        .then(response => response.json())
        .then(mockups => {
            const mockupList = document.getElementById('mockup-list');
            mockupList.innerHTML = ''; // Clear existing list
            mockups.forEach(mockup => {
                const li = document.createElement('li');
                li.className = 'mockup-item';
                li.onclick = () => {
                    window.location.href = `/index.html?uuid=${mockup.uuid}`;
                };

                const infoDiv = document.createElement('div');
                infoDiv.className = 'mockup-info';
                infoDiv.innerHTML = `
                    <strong>UUID:</strong> ${mockup.uuid.substring(0, 8)}...<br>
                    <strong>Creado:</strong> ${new Date(mockup.created_at).toLocaleString()}
                `;

                const previewImg = document.createElement('img');
                previewImg.className = 'mockup-preview';
                previewImg.src = mockup.screen_image || 'placeholder.png'; // Use a placeholder image if no screen image
                previewImg.alt = 'Mockup Preview';

                li.appendChild(infoDiv);
                li.appendChild(previewImg);
                mockupList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error al cargar los mockups:', error);
        });
}

function setupNewMockupButton() {
    const newMockupBtn = document.getElementById('new-mockup-btn');
    newMockupBtn.onclick = () => {
        window.location.href = '/index.html'; // This will create a new mockup
    };
}

// Load mockups and setup button when the page is ready
document.addEventListener('DOMContentLoaded', () => {
    loadMockups();
    setupNewMockupButton();
});