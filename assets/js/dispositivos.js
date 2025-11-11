

let dispositivos = [];
let usuarios = [];
let currentPage = 1;
let itemsPerPage = 10;
let searchTerm = '';
let filterEstado = '';
let filterBateriaBaja = false;
let notificationInterval;

document.addEventListener('DOMContentLoaded', function() {
    
    if (!Utils.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadUserData();
    loadDispositivos();
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
    
    document.getElementById('filterEstado').addEventListener('change', (e) => {
        filterEstado = e.target.value;
        currentPage = 1;
        renderTable();
    });
    
    document.getElementById('filterBateriaBaja').addEventListener('change', (e) => {
        filterBateriaBaja = e.target.checked;
        currentPage = 1;
        renderTable();
    });
    
    document.getElementById('btnRefresh').addEventListener('click', loadDispositivos);
    document.getElementById('btnNuevoDispositivo').addEventListener('click', () => openModal());
    
    
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);
    document.getElementById('formDispositivo').addEventListener('submit', handleSubmit);
    
    
    document.getElementById('btnCloseModalReasignar').addEventListener('click', closeReasignarModal);
    document.getElementById('btnCancelReasignar').addEventListener('click', closeReasignarModal);
    document.getElementById('btnConfirmReasignar').addEventListener('click', handleReasignar);
    
    
    document.getElementById('btnCloseModalEliminar').addEventListener('click', closeDeleteModal);
    document.getElementById('btnCancelEliminar').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmEliminar').addEventListener('click', handleDelete);
    
    
    document.getElementById('modalDispositivo').addEventListener('click', (e) => {
        if (e.target.id === 'modalDispositivo') closeModal();
    });
    document.getElementById('modalReasignar').addEventListener('click', (e) => {
        if (e.target.id === 'modalReasignar') closeReasignarModal();
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


async function loadDispositivos() {
    try {
        showLoading();
        
        const response = await fetch(`${CONFIG.API_URL}/api/dispositivos`, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            
            dispositivos = Array.isArray(data.data) ? data.data : (data.data.dispositivos || []);
            renderTable();
        } else {
            showAlert('Error al cargar dispositivos: ' + data.message, 'danger');
            dispositivos = [];
            renderTable();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al cargar dispositivos', 'danger');
        dispositivos = [];
        renderTable();
    }
}


async function loadUsuarios() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/usuarios`, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            
            usuarios = Array.isArray(data.data) ? data.data : (data.data.usuarios || []);
            updateUsuarioSelects();
        }
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
    }
}


function updateUsuarioSelects() {
    const selectUsuario = document.getElementById('usuarioId');
    const selectNuevoUsuario = document.getElementById('nuevoUsuarioId');
    
    const options = usuarios.map(u => 
        `<option value="${u.id}">${u.nombre_completo}</option>`
    ).join('');
    
    selectUsuario.innerHTML = '<option value="">Sin asignar</option>' + options;
    selectNuevoUsuario.innerHTML = '<option value="">Sin asignar</option>' + options;
}


function showLoading() {
    const tbody = document.getElementById('dispositivosTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="table-loading">
                <div class="spinner-border"></div>
                <div>Cargando dispositivos...</div>
            </td>
        </tr>
    `;
}


function renderTable() {
    const tbody = document.getElementById('dispositivosTableBody');
    
    
    let filteredDispositivos = dispositivos.filter(d => {
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matchSearch = d.numero_serie?.toLowerCase().includes(term) ||
                              d.imei?.toLowerCase().includes(term);
            if (!matchSearch) return false;
        }
        
        
        if (filterEstado && d.estado !== filterEstado) return false;
        
        
        if (filterBateriaBaja && d.nivel_bateria > 20) return false;
        
        return true;
    });
    
    
    const totalItems = filteredDispositivos.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedDispositivos = filteredDispositivos.slice(startIndex, endIndex);
    
    
    if (paginatedDispositivos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                    <h3>No se encontraron dispositivos</h3>
                    <p>${searchTerm || filterEstado || filterBateriaBaja ? 'Intenta ajustar los filtros' : 'Comienza agregando un nuevo dispositivo'}</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginatedDispositivos.map(d => {
            const bateriaBadge = d.nivel_bateria <= 20 ? 'badge-danger' : 
                                d.nivel_bateria <= 50 ? 'badge-warning' : 'badge-success';
            
            const estadoBadge = d.estado === 'activo' ? 'badge-success' : 'badge-secondary';
            
            const ultimaSenal = d.ultima_senal ? 
                new Date(d.ultima_senal).toLocaleString('es-MX', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) : '-';
            
            const numeroSerie = d.numero_serie || d.id || '';
            const safeNumeroSerie = numeroSerie.toString().replace(/'/g, "\\'");
            
            return `
                <tr>
                    <td>${d.id || '-'}</td>
                    <td><strong>${numeroSerie || '-'}</strong></td>
                    <td>${d.imei || '-'}</td>
                    <td>${d.usuario_nombre || '<span class="text-muted">Sin asignar</span>'}</td>
                    <td>
                        <span class="badge ${bateriaBadge}">${d.nivel_bateria || 0}%</span>
                    </td>
                    <td>
                        <span class="badge ${estadoBadge}">${(d.estado || 'inactivo').charAt(0).toUpperCase() + (d.estado || 'inactivo').slice(1)}</span>
                    </td>
                    <td>${ultimaSenal}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-icon" onclick="openModal(${d.id})" title="Editar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                            <button class="btn-icon" onclick="openReasignarModal(${d.id}, '${safeNumeroSerie}', ${d.usuario_id || 'null'})" title="Reasignar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                                </svg>
                            </button>
                            <button class="btn-icon btn-danger" onclick="openDeleteModal(${d.id}, '${safeNumeroSerie}')}" title="Eliminar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
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
    
    let html = `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Anterior</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<button disabled>...</button>`;
        }
    }
    
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Siguiente</button>`;
    
    pagination.innerHTML = html;
}


function changePage(page) {
    currentPage = page;
    renderTable();
}


function openModal(dispositivoId = null) {
    const modal = document.getElementById('modalDispositivo');
    const form = document.getElementById('formDispositivo');
    
    form.reset();
    
    if (dispositivoId) {
        document.getElementById('modalTitle').textContent = 'Editar Dispositivo';
        document.getElementById('btnSaveText').textContent = 'Actualizar Dispositivo';
        
        const dispositivo = dispositivos.find(d => d.id === dispositivoId);
        if (dispositivo) {
            document.getElementById('dispositivoId').value = dispositivo.id;
            document.getElementById('numeroSerie').value = dispositivo.numero_serie || '';
            document.getElementById('imei').value = dispositivo.imei || '';
            document.getElementById('usuarioId').value = dispositivo.usuario_id || '';
            document.getElementById('nivelBateria').value = dispositivo.nivel_bateria || 100;
            document.getElementById('estado').value = dispositivo.estado || 'activo';
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Nuevo Dispositivo';
        document.getElementById('btnSaveText').textContent = 'Guardar Dispositivo';
        document.getElementById('nivelBateria').value = 100;
        document.getElementById('estado').value = 'activo';
    }
    
    modal.classList.add('show');
}


function closeModal() {
    document.getElementById('modalDispositivo').classList.remove('show');
}


async function handleSubmit(e) {
    e.preventDefault();
    
    const dispositivoId = document.getElementById('dispositivoId').value;
    const isEdit = !!dispositivoId;
    
    const data = {
        numero_serie: document.getElementById('numeroSerie').value,
        imei: document.getElementById('imei').value,
        usuario_id: document.getElementById('usuarioId').value || null,
        nivel_bateria: parseInt(document.getElementById('nivelBateria').value),
        estado: document.getElementById('estado').value
    };
    
    const btnSave = document.getElementById('btnSaveDispositivo');
    const btnSaveText = document.getElementById('btnSaveText');
    
    try {
        btnSave.disabled = true;
        btnSaveText.innerHTML = '<div class="spinner-border" style="width: 1rem; height: 1rem; border-width: 2px;"></div> Guardando...';
        
        const url = isEdit ? 
            `${CONFIG.API_URL}/api/dispositivos/${dispositivoId}` : 
            `${CONFIG.API_URL}/api/dispositivos`;
        
        const response = await fetch(url, {
            method: isEdit ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Utils.getToken()}`
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(isEdit ? 'Dispositivo actualizado exitosamente' : 'Dispositivo creado exitosamente', 'success');
            closeModal();
            loadDispositivos();
        } else {
            showAlert('Error: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al guardar dispositivo', 'danger');
    } finally {
        btnSave.disabled = false;
        btnSaveText.textContent = isEdit ? 'Actualizar Dispositivo' : 'Guardar Dispositivo';
    }
}


function openReasignarModal(dispositivoId, numeroSerie, usuarioActual) {
    document.getElementById('reasignarDispositivoId').value = dispositivoId;
    document.getElementById('reasignarDispositivoSerie').textContent = numeroSerie;
    document.getElementById('nuevoUsuarioId').value = usuarioActual || '';
    document.getElementById('modalReasignar').classList.add('show');
}


function closeReasignarModal() {
    document.getElementById('modalReasignar').classList.remove('show');
}


async function handleReasignar() {
    const dispositivoId = document.getElementById('reasignarDispositivoId').value;
    const nuevoUsuarioId = document.getElementById('nuevoUsuarioId').value;
    const btnConfirm = document.getElementById('btnConfirmReasignar');
    
    try {
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Reasignando...';
        
        const response = await fetch(`${CONFIG.API_URL}/api/dispositivos/${dispositivoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Utils.getToken()}`
            },
            body: JSON.stringify({
                action: 'reassign',
                usuario_id: nuevoUsuarioId || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Dispositivo reasignado exitosamente', 'success');
            closeReasignarModal();
            loadDispositivos();
        } else {
            showAlert('Error: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al reasignar dispositivo', 'danger');
    } finally {
        btnConfirm.disabled = false;
        btnConfirm.textContent = 'Reasignar';
    }
}


function openDeleteModal(dispositivoId, numeroSerie) {
    document.getElementById('deleteDispositivoId').value = dispositivoId;
    document.getElementById('deleteDispositivoSerie').textContent = numeroSerie;
    document.getElementById('modalEliminar').classList.add('show');
}


function closeDeleteModal() {
    document.getElementById('modalEliminar').classList.remove('show');
}


async function handleDelete() {
    const dispositivoId = document.getElementById('deleteDispositivoId').value;
    const btnConfirm = document.getElementById('btnConfirmEliminar');
    
    try {
        btnConfirm.disabled = true;
        btnConfirm.textContent = 'Eliminando...';
        
        const response = await fetch(`${CONFIG.API_URL}/api/dispositivos/${dispositivoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Dispositivo eliminado exitosamente', 'success');
            closeDeleteModal();
            loadDispositivos();
        } else {
            showAlert('Error: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al eliminar dispositivo', 'danger');
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
    
    container.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    setTimeout(() => container.innerHTML = '', 5000);
}


async function loadNotifications() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/eventos?pendientes=true&limit=10`, {
            headers: { 'Authorization': `Bearer ${Utils.getToken()}` }
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
    document.querySelectorAll('.notification-item').forEach(item => item.classList.remove('unread'));
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

