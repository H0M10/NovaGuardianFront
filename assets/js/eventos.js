

let eventos = [];
let usuarios = [];
let currentPage = 1;
let itemsPerPage = 10;
let filters = {
    tipo: '',
    usuario_id: '',
    estado: '',
    fecha_inicio: '',
    fecha_fin: ''
};
let notificationInterval;

document.addEventListener('DOMContentLoaded', function() {
    
    if (!Utils.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    loadUserData();
    loadEventos();
    loadUsuarios();
    loadNotifications();
    
    notificationInterval = setInterval(loadNotifications, 10000);
    
    setupEventListeners();
    initializeDates();
});


function initializeDates() {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    document.getElementById('filterFechaInicio').value = hace30Dias.toISOString().split('T')[0];
    document.getElementById('filterFechaFin').value = hoy.toISOString().split('T')[0];
    
    
    document.getElementById('exportFechaInicio').value = hace30Dias.toISOString().split('T')[0];
    document.getElementById('exportFechaFin').value = hoy.toISOString().split('T')[0];
}


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
    
    
    document.getElementById('filterTipo').addEventListener('change', applyFilters);
    document.getElementById('filterUsuario').addEventListener('change', applyFilters);
    document.getElementById('filterEstado').addEventListener('change', applyFilters);
    document.getElementById('filterFechaInicio').addEventListener('change', applyFilters);
    document.getElementById('filterFechaFin').addEventListener('change', applyFilters);
    
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);
    document.getElementById('btnRefresh').addEventListener('click', loadEventos);
    
    
    document.getElementById('btnExportarCSV').addEventListener('click', () => openExportModal());
    
    
    document.getElementById('btnCloseModal').addEventListener('click', closeModal);
    document.getElementById('btnCancelModal').addEventListener('click', closeModal);
    
    
    document.getElementById('btnCloseModalExportar').addEventListener('click', closeExportModal);
    document.getElementById('btnCancelExportar').addEventListener('click', closeExportModal);
    document.getElementById('btnConfirmExportar').addEventListener('click', handleExport);
    
    
    document.querySelectorAll('.btn-estado').forEach(btn => {
        btn.addEventListener('click', () => handleEstadoChange(btn.dataset.estado));
    });
    
    
    document.getElementById('modalEvento').addEventListener('click', (e) => {
        if (e.target.id === 'modalEvento') closeModal();
    });
    document.getElementById('modalExportar').addEventListener('click', (e) => {
        if (e.target.id === 'modalExportar') closeExportModal();
    });
}


function loadUserData() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('userName').textContent = user.nombre;
    }
}


async function loadEventos() {
    try {
        showLoading();
        
        
        let url = `${CONFIG.API_URL}/api/eventos`;
        const params = new URLSearchParams();
        
        if (filters.tipo) params.append('tipo', filters.tipo);
        if (filters.usuario_id) params.append('usuario_id', filters.usuario_id);
        if (filters.estado) params.append('estado', filters.estado);
        if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
        if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            
            eventos = Array.isArray(data.data) ? data.data : (data.data.eventos || []);
            renderTable();
        } else {
            showAlert('Error al cargar eventos: ' + data.message, 'danger');
            eventos = [];
            renderTable();
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al cargar eventos', 'danger');
        eventos = [];
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
    const selectFilter = document.getElementById('filterUsuario');
    const selectExport = document.getElementById('exportUsuarioId');
    
    const options = usuarios.map(u => 
        `<option value="${u.id}">${u.nombre_completo}</option>`
    ).join('');
    
    selectFilter.innerHTML = '<option value="">Todos los usuarios</option>' + options;
    selectExport.innerHTML = '<option value="">Todos los usuarios</option>' + options;
}


function applyFilters() {
    filters.tipo = document.getElementById('filterTipo').value;
    filters.usuario_id = document.getElementById('filterUsuario').value;
    filters.estado = document.getElementById('filterEstado').value;
    filters.fecha_inicio = document.getElementById('filterFechaInicio').value;
    filters.fecha_fin = document.getElementById('filterFechaFin').value;
    
    currentPage = 1;
    loadEventos();
}


function limpiarFiltros() {
    document.getElementById('filterTipo').value = '';
    document.getElementById('filterUsuario').value = '';
    document.getElementById('filterEstado').value = '';
    
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    document.getElementById('filterFechaInicio').value = hace30Dias.toISOString().split('T')[0];
    document.getElementById('filterFechaFin').value = hoy.toISOString().split('T')[0];
    
    filters = {
        tipo: '',
        usuario_id: '',
        estado: '',
        fecha_inicio: '',
        fecha_fin: ''
    };
    
    currentPage = 1;
    loadEventos();
}


function showLoading() {
    const tbody = document.getElementById('eventosTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="table-loading">
                <div class="spinner-border"></div>
                <div>Cargando eventos...</div>
            </td>
        </tr>
    `;
}


function renderTable() {
    const tbody = document.getElementById('eventosTableBody');
    
    
    const totalItems = eventos.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEventos = eventos.slice(startIndex, endIndex);
    
    
    if (paginatedEventos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    <h3>No se encontraron eventos</h3>
                    <p>No hay eventos que coincidan con los filtros aplicados</p>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = paginatedEventos.map(e => {
            const estadoBadge = e.estado === 'Pendiente' ? 'badge-warning' : 
                               e.estado === 'Atendido' ? 'badge-info' : 'badge-success';
            
            let tipoBadge = 'badge-secondary';
            if (e.tipo === 'SOS') tipoBadge = 'badge-tipo-sos';
            else if (e.tipo === 'Caída') tipoBadge = 'badge-tipo-caida';
            else if (e.tipo.includes('Frecuencia')) tipoBadge = 'badge-tipo-frecuencia';
            else if (e.tipo.includes('Batería')) tipoBadge = 'badge-tipo-bateria';
            else if (e.tipo.includes('Zona')) tipoBadge = 'badge-tipo-zona';
            
            const fecha = new Date(e.fecha_hora);
            const fechaFormateada = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }) + 
                                   ' ' + fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            
            return `
                <tr>
                    <td>${e.id}</td>
                    <td><span class="badge ${tipoBadge}">${e.tipo}</span></td>
                    <td>${e.usuario_nombre || '-'}</td>
                    <td>${e.descripcion || '-'}</td>
                    <td>${fechaFormateada}</td>
                    <td><span class="badge ${estadoBadge}">${e.estado}</span></td>
                    <td>
                        <button class="btn-icon" onclick="openModal(${e.id})" title="Ver detalle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                        </button>
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


function openModal(eventoId) {
    const evento = eventos.find(e => e.id === eventoId);
    if (!evento) return;
    
    document.getElementById('eventoId').value = evento.id;
    
    
    const estadoBadge = evento.estado === 'Pendiente' ? 'badge-warning' : 
                       evento.estado === 'Atendido' ? 'badge-info' : 'badge-success';
    
    let tipoBadge = 'badge-secondary';
    if (evento.tipo === 'SOS') tipoBadge = 'badge-tipo-sos';
    else if (evento.tipo === 'Caída') tipoBadge = 'badge-tipo-caida';
    else if (evento.tipo.includes('Frecuencia')) tipoBadge = 'badge-tipo-frecuencia';
    else if (evento.tipo.includes('Batería')) tipoBadge = 'badge-tipo-bateria';
    else if (evento.tipo.includes('Zona')) tipoBadge = 'badge-tipo-zona';
    
    const fecha = new Date(evento.fecha_hora);
    const fechaFormateada = fecha.toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('detailTipo').innerHTML = `<span class="badge ${tipoBadge}">${evento.tipo}</span>`;
    document.getElementById('detailUsuario').textContent = evento.usuario_nombre || 'Sin usuario';
    document.getElementById('detailFechaHora').textContent = fechaFormateada;
    document.getElementById('detailEstado').innerHTML = `<span class="badge ${estadoBadge}">${evento.estado}</span>`;
    document.getElementById('detailDescripcion').textContent = evento.descripcion || 'Sin descripción';
    document.getElementById('detailUbicacion').textContent = evento.ubicacion || 'No disponible';
    
    
    if (evento.admin_atendio_nombre) {
        document.getElementById('adminAtendioContainer').style.display = 'block';
        document.getElementById('detailAdminAtendio').textContent = evento.admin_atendio_nombre;
    } else {
        document.getElementById('adminAtendioContainer').style.display = 'none';
    }
    
    
    document.querySelectorAll('.btn-estado').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.estado === evento.estado) {
            btn.classList.add('active');
        }
    });
    
    document.getElementById('modalEvento').classList.add('show');
}


function closeModal() {
    document.getElementById('modalEvento').classList.remove('show');
}


async function handleEstadoChange(nuevoEstado) {
    const eventoId = document.getElementById('eventoId').value;
    
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/eventos/${eventoId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Utils.getToken()}`
            },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(`Estado actualizado a: ${nuevoEstado}`, 'success');
            
            
            const evento = eventos.find(e => e.id == eventoId);
            if (evento) {
                evento.estado = nuevoEstado;
            }
            
            
            document.querySelectorAll('.btn-estado').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.estado === nuevoEstado) {
                    btn.classList.add('active');
                }
            });
            
            
            const estadoBadge = nuevoEstado === 'Pendiente' ? 'badge-warning' : 
                               nuevoEstado === 'Atendido' ? 'badge-info' : 'badge-success';
            document.getElementById('detailEstado').innerHTML = `<span class="badge ${estadoBadge}">${nuevoEstado}</span>`;
            
            
            renderTable();
        } else {
            showAlert('Error al actualizar estado: ' + result.message, 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al actualizar estado', 'danger');
    }
}


function openExportModal() {
    document.getElementById('modalExportar').classList.add('show');
}


function closeExportModal() {
    document.getElementById('modalExportar').classList.remove('show');
}


async function handleExport() {
    const usuarioId = document.getElementById('exportUsuarioId').value;
    const fechaInicio = document.getElementById('exportFechaInicio').value;
    const fechaFin = document.getElementById('exportFechaFin').value;
    
    if (!fechaInicio || !fechaFin) {
        showAlert('Debe seleccionar un rango de fechas', 'warning');
        return;
    }
    
    const btnConfirm = document.getElementById('btnConfirmExportar');
    
    try {
        btnConfirm.disabled = true;
        btnConfirm.innerHTML = '<div class="spinner-border" style="width: 1rem; height: 1rem; border-width: 2px;"></div> Generando...';
        
        let url = `${CONFIG.API_URL}/api/export?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        if (usuarioId) {
            url += `&usuario_id=${usuarioId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `eventos_${fechaInicio}_${fechaFin}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            
            showAlert('CSV descargado exitosamente', 'success');
            closeExportModal();
        } else {
            showAlert('Error al generar el archivo CSV', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error de conexión al exportar', 'danger');
    } finally {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            Descargar
        `;
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
            <div class="notification-item unread" onclick="openModal(${notif.id})">
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

window.addEventListener('beforeunload', () => {
    if (notificationInterval) clearInterval(notificationInterval);
});

