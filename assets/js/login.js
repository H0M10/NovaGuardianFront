

document.addEventListener('DOMContentLoaded', function() {
    
    if (Utils.isAuthenticated()) {
        window.location.href = 'dashboard.html';
        return;
    }
    
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const loginBtnText = document.getElementById('loginBtnText');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const passwordInput = document.getElementById('password');
    const alertContainer = document.getElementById('alertContainer');
    
    
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        if (type === 'text') {
            eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.75 6.75m12.5 12.5l-3.128-3.128m0 0A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908" />';
        } else {
            eyeIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />';
        }
    });
    
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        
        if (!email || !password) {
            showAlert('Por favor complete todos los campos', 'warning');
            return;
        }
        
        
        loginBtn.disabled = true;
        loginBtnText.innerHTML = '<div class="spinner"></div> Verificando...';
        
        try {
            
            const response = await fetch(`${CONFIG.API_URL}/api/auth`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                
                Utils.setToken(data.data.token);
                localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(data.data.admin));
                
                
                showAlert('Inicio de sesión exitoso. Redirigiendo...', 'success');
                
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
                
            } else {
                
                showAlert(data.message || 'Credenciales incorrectas', 'danger');
                
                
                loginBtn.disabled = false;
                loginBtnText.textContent = 'Iniciar Sesión';
            }
            
        } catch (error) {
            console.error('Error:', error);
            showAlert('Error de conexión con el servidor. Verifique su conexión.', 'danger');
            
            
            loginBtn.disabled = false;
            loginBtnText.textContent = 'Iniciar Sesión';
        }
    });
    
    
    function showAlert(message, type) {
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'danger' ? 'alert-danger' : 
                          type === 'warning' ? 'alert-warning' : 'alert-info';
        
        alertContainer.innerHTML = `
            <div class="alert ${alertClass}">
                ${message}
            </div>
        `;
        
        
        setTimeout(() => {
            alertContainer.innerHTML = '';
        }, 5000);
    }
});

