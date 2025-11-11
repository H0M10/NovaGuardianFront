

let usuarios = [];
let currentPage = 1;
let itemsPerPage = 10;
let searchTerm = '';
let notificationInterval;

document.addEventListener('DOMContentLoaded', function() {
    
    if (!Utils.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    
    loadUserData();
    
    
    loadUsuarios();
    
    
    loadNotifications();
    notificationInterval = setInterval(loadNotifications, 10000);
    
    
    setupEventListeners();
});


function setupEventListeners() {
    
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuToggle && sidebar && overlay) {
        
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        });
        
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
        
        
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (window.innerWidth > 1024) {
                    sidebar.classList.remove('show');
                    overlay.classList.remove('show');
                }
            }, 250);
        });
    }
    
    
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsPanel = document.getElementById('notificationsPanel');
    
    notificationsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationsPanel.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!notificationsPanel.contains(e.target) && !notificationsBtn.contains(e.target)) {
            notificationsPanel.classList.remove('show');
        }
    });
    
    document.getElementById('btnMarkAllRead').addEventListener('click', markAllNotificationsRead);
    
    
    document.getElementById('btnLogout').addEventListener('click', logout);
    
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce((e) => {
        searchTerm = e.target.value;
        currentPage = 1;
        renderTable();
    }, 500));
    
    
    document.getElementById('btnRefresh').addEventListener('click', loadUsuarios);
    
    
    document.getElementById('btnNuevoUsuario').addEventListener('click', () => openModal());
    
    
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);
    document.getElementById('formUsuario').addEventListener('submit', handleSubmit);
    
    
    document.getElementById('btnCloseModalEliminar').addEventListener('click', closeDeleteModal);
    document.getElementById('btnCancelEliminar').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmEliminar').addEventListener('click', handleDelete);
    
    
    document.getElementById('modalUsuario').addEventListener('click', (e) => {
        if (e.target.id === 'modalUsuario') closeModal();
    });
    
    document.getElementById('modalEliminar').addEventListener('click', (e) => {
        if (e.target.id === 'modalEliminar') closeDeleteModal();
    });
}


function loadUserData() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('userName').textContent = user.nombre;
    }
}


async function loadUsuarios() {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}/api/usuarios`, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            
            usuarios = data.data.usuarios || data.data || [];
            totalUsuarios = data.data.total || usuarios.length;
            renderTable();
        } else {
            showAlert('Error al cargar usuarios: ' + data.message, 'danger');
            usuarios = [];
            renderTable();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al cargar usuarios', 'danger');
        usuarios = [];
        renderTable();
    }
}


function showLoading() {
    const tbody = document.getElementById('usuariosTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="table-loading">
                <div class="spinner-border"></div>
                <div>Cargando usuarios...</div>
            </td>
        </tr>
    `;
}


function renderTable() {
    const tbody = document.getElementById('usuariosTableBody');
    
    
    let filteredUsuarios = usuarios;
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredUsuarios = usuarios.filter(u => 
            u.nombre_completo?.toLowerCase().includes(term) ||
            u.telefono?.toLowerCase().includes(term) ||
            u.direccion?.toLowerCase().includes(term)
        );
    }
    
    
    const totalItems = filteredUsuarios.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedUsuarios = filteredUsuarios.slice(startIndex, endIndex);
    
    
    if (paginatedUsuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                    </svg>
                    <h3>No se encontraron usuarios</h3>
                    <p>${searchTerm ? 'Intenta con otro término de búsqueda' : 'Comienza agregando un nuevo usuario'}</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginatedUsuarios.map(usuario => `
            <tr>
                <td>${usuario.id}</td>
                <td><strong>${usuario.nombre_completo}</strong></td>
                <td>${usuario.edad || '-'}</td>
                <td>${usuario.telefono || '-'}</td>
                <td>${usuario.contacto_emergencia_1 || '-'}</td>
                <td>
                    ${usuario.dispositivo_id ? 
                        `<span class="badge badge-success">Asignado</span>` : 
                        `<span class="badge badge-secondary">Sin asignar</span>`
                    }
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-icon" onclick="openModal(${usuario.id})" title="Editar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="btn-icon btn-danger" onclick="openDeleteModal(${usuario.id}, '${usuario.nombre_completo.replace(/'/g, "\\'")}')}" title="Eliminar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    
    const start = totalItems === 0 ? 0 : startIndex + 1;
    const end = Math.min(endIndex, totalItems);
    document.getElementById('paginationInfo').textContent = `${start}-${end} de ${totalItems}`;
    
    
    renderPagination(totalPages);
}


function renderPagination(totalPages) {
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = `
        <button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            Anterior
        </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            html += `
                <button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<button disabled>...</button>`;
        }
    }
    
    html += `
        <button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            Siguiente
        </button>
    `;
    
    pagination.innerHTML = html;
}


function changePage(page) {
    currentPage = page;
    renderTable();
}


function openModal(usuarioId = null) {
    const modal = document.getElementById('modalUsuario');
    const form = document.getElementById('formUsuario');
    
    form.reset();
    
    if (usuarioId) {
        
        document.getElementById('modalTitle').textContent = 'Editar Usuario';
        document.getElementById('btnSaveText').textContent = 'Actualizar Usuario';
        
        const usuario = usuarios.find(u => u.id === usuarioId);
        if (usuario) {
            document.getElementById('usuarioId').value = usuario.id;
            document.getElementById('nombreCompleto').value = usuario.nombre_completo || '';
            document.getElementById('edad').value = usuario.edad || '';
            document.getElementById('telefono').value = usuario.telefono || '';
            document.getElementById('direccion').value = usuario.direccion || '';
            document.getElementById('contactoEmergencia1').value = usuario.contacto_emergencia_1 || '';
            document.getElementById('contactoEmergencia2').value = usuario.contacto_emergencia_2 || '';
            document.getElementById('condicionesMedicas').value = usuario.condiciones_medicas || '';
            document.getElementById('medicamentos').value = usuario.medicamentos || '';
        }
    } else {
        
        document.getElementById('modalTitle').textContent = 'Nuevo Usuario';
        document.getElementById('btnSaveText').textContent = 'Guardar Usuario';
    }
    
    modal.classList.add('show');
}


function closeModal() {
    document.getElementById('modalUsuario').classList.remove('show');
    document.getElementById('formUsuario').reset();
}


async function handleSubmit(e) {
    e.preventDefault();
    
    const usuarioId = document.getElementById('usuarioId').value;
    const isEdit = !!usuarioId;
    
    const data = {
        nombre_completo: document.getElementById('nombreCompleto').value,
        edad: parseInt(document.getElementById('edad').value),
        telefono: document.getElementById('telefono').value || null,
        direccion: document.getElementById('direccion').value || null,
        contacto_emergencia_1: document.getElementById('contactoEmergencia1').value,
        contacto_emergencia_2: document.getElementById('contactoEmergencia2').value || null,
        condiciones_medicas: document.getElementById('condicionesMedicas').value || null,
        medicamentos: document.getElementById('medicamentos').value || null
    };
    
    const btnSave = document.getElementById('btnSaveUsuario');
    const btnSaveText = document.getElementById('btnSaveText');
    
    try {
        btnSave.disabled = true;
        btnSaveText.innerHTML = '<div class="spinner-border" style="width: 1rem; height: 1rem; border-width: 2px;"></div> Guardando...';
        
        const url = isEdit ? 
            `${CONFIG.API_URL}/api/usuarios/${usuarioId}` : 
            `${CONFIG.API_URL}/api/usuarios`;
        
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Utils.getToken()}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(isEdit ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente', 'success');
            closeModal();
            loadUsuarios();
        } else {
            showAlert('Error: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al guardar usuario', 'danger');
    } finally {
        btnSave.disabled = false;
        btnSaveText.textContent = isEdit ? 'Actualizar Usuario' : 'Guardar Usuario';
    }
}


function openDeleteModal(usuarioId, nombre) {
    document.getElementById('deleteUsuarioId').value = usuarioId;
    document.getElementById('deleteUsuarioNombre').textContent = nombre;
    document.getElementById('modalEliminar').classList.add('show');
}


function closeDeleteModal() {
    document.getElementById('modalEliminar').classList.remove('show');
}


async function handleDelete() {
    const usuarioId = document.getElementById('deleteUsuarioId').value;
    const btnConfirm = document.getElementById('btnConfirmEliminar');
    
    try {
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Eliminando...';
        
        const response = await fetch(`${CONFIG.API_URL}/api/usuarios/${usuarioId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Usuario eliminado exitosamente', 'success');
            closeDeleteModal();
            loadUsuarios();
        } else {
            showAlert('Error: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al eliminar usuario', 'danger');
    } finally {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Eliminar';
    }
}


function showAlert(message, type) {
    const container = document.getElementById('alertContainer');
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'danger' ? 'alert-danger' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';
    
    container.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}


async function loadNotifications() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/eventos?pendientes=true&limit=10`, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const notifications = Array.isArray(data.data) ? data.data : (data.data.eventos || data.data || []);
            renderNotifications(notifications);
        }
    } catch (error) {
        console.error('Error al cargar notificaciones:', error);
    }
}


function renderNotifications(notifications) {
    const badge = document.getElementById('notificationsBadge');
    const list = document.getElementById('notificationsList');
    
    const count = notifications ? notifications.length : 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
    
    if (!notifications || notifications.length === 0) {
        list.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-tertiary);">No hay notificaciones pendientes</div>';
        return;
    }
    
    list.innerHTML = notifications.map(notif => {
        const fecha = new Date(notif.fecha_hora);
        const ahora = new Date();
        const diffMinutos = Math.floor((ahora - fecha) / 60000);
        
        let tiempoTexto;
        if (diffMinutos < 1) tiempoTexto = 'Ahora';
        else if (diffMinutos < 60) tiempoTexto = `Hace ${diffMinutos} min`;
        else tiempoTexto = `Hace ${Math.floor(diffMinutos / 60)} h`;
        
        return `
            <div class="notification-item unread" onclick="window.location.href='eventos.html?id=${notif.id}'">
                <div class="notification-header">
                    <span class="notification-type">${notif.tipo}</span>
                    <span class="notification-time">${tiempoTexto}</span>
                </div>
                <div class="notification-message">
                    ${notif.usuario_nombre || 'Usuario'}: ${notif.descripcion || 'Evento detectado'}
                </div>
            </div>
        `;
    }).join('');
}


function markAllNotificationsRead() {
    document.getElementById('notificationsBadge').textContent = '0';
    document.getElementById('notificationsBadge').style.display = 'none';
    
    const items = document.querySelectorAll('.notification-item');
    items.forEach(item => item.classList.remove('unread'));
}


function logout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        if (notificationInterval) clearInterval(notificationInterval);
        Utils.clearAuth();
        window.location.href = 'login.html';
    }
}


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


window.addEventListener('beforeunload', () => {
    if (notificationInterval) clearInterval(notificationInterval);
});

