


let chartEventosTipo, chartDispositivosEstado, chartEventosDiarios;
let notificationInterval;

document.addEventListener('DOMContentLoaded', function() {
    
    if (!Utils.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    
    
    loadUserData();
    
    
    loadDashboardData();
    
    
    initCharts();
    
    
    loadNotifications();
    
    
    notificationInterval = setInterval(loadNotifications, 10000);
    
    
    setupEventListeners();
});


function setupEventListeners() {
    
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuToggle && sidebar && overlay) {
        
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
        });
        
        
        overlay.addEventListener('click', function() {
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
    
    notificationsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        notificationsPanel.classList.toggle('show');
    });
    
    
    document.addEventListener('click', function(e) {
        if (!notificationsPanel.contains(e.target) && !notificationsBtn.contains(e.target)) {
            notificationsPanel.classList.remove('show');
        }
    });
    
    
    const btnMarkAllRead = document.getElementById('btnMarkAllRead');
    btnMarkAllRead.addEventListener('click', markAllNotificationsRead);
    
    
    const btnLogout = document.getElementById('btnLogout');
    btnLogout.addEventListener('click', logout);
}


function loadUserData() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('userName').textContent = user.nombre;
    }
}


async function loadDashboardData() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/dashboard`, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            
            const stats = data.data.estadisticas || data.data;
            
            
            document.getElementById('statTotalUsuarios').textContent = stats.total_usuarios || 0;
            document.getElementById('statDispositivosActivos').textContent = stats.dispositivos_activos || 0;
            document.getElementById('statAlertasPendientes').textContent = stats.alertas_pendientes || 0;
            document.getElementById('statEventosHoy').textContent = stats.eventos_hoy || 0;
            
            
            updateCharts(data.data.graficas || data.data);
            
            
            loadRecentAlerts();
        } else {
            console.error('Error al cargar datos del dashboard:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}


function initCharts() {
    
    const colors = {
        primary: '#1e40af',
        success: '#059669',
        warning: '#d97706',
        danger: '#dc2626',
        info: '#0284c7'
    };
    
    
    const ctxEventosTipo = document.getElementById('chartEventosTipo').getContext('2d');
    chartEventosTipo = new Chart(ctxEventosTipo, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Cantidad de Eventos',
                data: [],
                backgroundColor: colors.primary,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
    
    
    const ctxDispositivosEstado = document.getElementById('chartDispositivosEstado').getContext('2d');
    chartDispositivosEstado = new Chart(ctxDispositivosEstado, {
        type: 'doughnut',
        data: {
            labels: ['Activos', 'Inactivos', 'Batería Baja'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    colors.success,
                    colors.danger,
                    colors.warning
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    
    const ctxEventosDiarios = document.getElementById('chartEventosDiarios').getContext('2d');
    chartEventosDiarios = new Chart(ctxEventosDiarios, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Eventos',
                data: [],
                borderColor: colors.primary,
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 3,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}


function updateCharts(stats) {
    
    if (stats.eventos_por_tipo && chartEventosTipo) {
        const tipos = stats.eventos_por_tipo.map(item => item.tipo);
        const cantidades = stats.eventos_por_tipo.map(item => parseInt(item.cantidad));
        
        chartEventosTipo.data.labels = tipos;
        chartEventosTipo.data.datasets[0].data = cantidades;
        chartEventosTipo.update();
    }
    
    
    if (chartDispositivosEstado && stats.estado_dispositivos) {
        const activos = parseInt(stats.estado_dispositivos.activo) || 0;
        const inactivos = parseInt(stats.estado_dispositivos.inactivo) || 0;
        const mantenimiento = parseInt(stats.estado_dispositivos.mantenimiento) || 0;
        
        chartDispositivosEstado.data.datasets[0].data = [activos, inactivos, mantenimiento];
        chartDispositivosEstado.update();
    }
    
    
    if (stats.eventos_por_dia && chartEventosDiarios) {
        const fechas = stats.eventos_por_dia.map(item => {
            const fecha = new Date(item.fecha);
            return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        });
        const cantidades = stats.eventos_por_dia.map(item => parseInt(item.cantidad));
        
        chartEventosDiarios.data.labels = fechas;
        chartEventosDiarios.data.datasets[0].data = cantidades;
        chartEventosDiarios.update();
    }
}


async function loadRecentAlerts() {
    try {
        const response = await fetch(`${CONFIG.API_URL}/api/eventos?recientes=10`, {
            headers: {
                'Authorization': `Bearer ${Utils.getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            
            const alerts = Array.isArray(data.data) ? data.data : (data.data.eventos || data.data || []);
            renderRecentAlerts(alerts);
        }
    } catch (error) {
        console.error('Error al cargar alertas recientes:', error);
    }
}


function renderRecentAlerts(alerts) {
    const tbody = document.getElementById('recentAlertsTable');
    
    if (!alerts || alerts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay alertas recientes</td></tr>';
        return;
    }
    
    tbody.innerHTML = alerts.map(alert => {
        const badgeClass = alert.estado === 'Pendiente' ? 'badge-warning' :
                          alert.estado === 'Atendido' ? 'badge-info' :
                          'badge-success';
        
        // Formatear fecha de manera segura
        let fechaFormateada = 'Fecha no disponible';
        if (alert.fecha_hora) {
            try {
                const fecha = new Date(alert.fecha_hora);
                if (!isNaN(fecha.getTime())) {
                    fechaFormateada = fecha.toLocaleDateString('es-MX') + ' ' + 
                                     fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                }
            } catch (e) {
                console.error('Error al formatear fecha:', e);
            }
        }
        
        return `
            <tr>
                <td>${alert.usuario_nombre || alert.nombre_usuario || 'Usuario desconocido'}</td>
                <td>${alert.tipo || 'N/A'}</td>
                <td>${alert.descripcion || '-'}</td>
                <td>${fechaFormateada}</td>
                <td><span class="badge ${badgeClass}">${alert.estado || 'Desconocido'}</span></td>
            </tr>
        `;
    }).join('');
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
        let tiempoTexto = 'Hace un momento';
        
        if (notif.fecha_hora) {
            try {
                const fecha = new Date(notif.fecha_hora);
                if (!isNaN(fecha.getTime())) {
                    const ahora = new Date();
                    const diffMinutos = Math.floor((ahora - fecha) / 60000);
                    
                    if (diffMinutos < 1) {
                        tiempoTexto = 'Ahora';
                    } else if (diffMinutos < 60) {
                        tiempoTexto = `Hace ${diffMinutos} min`;
                    } else {
                        const horas = Math.floor(diffMinutos / 60);
                        tiempoTexto = `Hace ${horas} h`;
                    }
                }
            } catch (e) {
                console.error('Error al calcular tiempo:', e);
            }
        }
        
        return `
            <div class="notification-item unread" onclick="viewNotification(${notif.id})">
                <div class="notification-header">
                    <span class="notification-type">${notif.tipo || 'Evento'}</span>
                    <span class="notification-time">${tiempoTexto}</span>
                </div>
                <div class="notification-message">
                    ${notif.usuario_nombre || notif.nombre_usuario || 'Usuario'}: ${notif.descripcion || 'Evento detectado'}
                </div>
            </div>
        `;
    }).join('');
}


function viewNotification(eventoId) {
    window.location.href = `eventos.html?id=${eventoId}`;
}


function markAllNotificationsRead() {
    document.getElementById('notificationsBadge').textContent = '0';
    document.getElementById('notificationsBadge').style.display = 'none';
    
    const items = document.querySelectorAll('.notification-item');
    items.forEach(item => item.classList.remove('unread'));
}


function logout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        
        if (notificationInterval) {
            clearInterval(notificationInterval);
        }
        
        
        Utils.clearAuth();
        
        
        window.location.href = 'login.html';
    }
}


window.addEventListener('beforeunload', function() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
    }
});

