// main.js - Main JavaScript for the frontend

// API URL - Change this to your actual backend URL when deploying
const API_URL = 'http://localhost:3000/api';

// Check if user is logged in
function checkAuth() {
  const token = localStorage.getItem('token');
  
  if (token) {
    // Update UI for logged in state
    document.querySelectorAll('.nav-item:last-child .nav-link').forEach(link => {
      link.textContent = 'My Account';
      link.href = 'dashboard.html';
    });
    
    return true;
  }
  
  return false;
}

// Handle login form submission
function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })
  .then(response => response.json())
  .then(data => {
    if (data.token) {
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userName', data.name);
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      // Show error message
      alert(data.message || 'Login failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Login error:', error);
    alert('An error occurred during login. Please try again.');
  });
}

// Handle registration form submission
function handleRegistration(event) {
  event.preventDefault();
  
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const phone = document.getElementById('registerPhone').value;
  
  // Validate password match
  if (password !== confirmPassword) {
    alert('Passwords do not match');
    return;
  }
  
  fetch(`${API_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, email, password, phone })
  })
  .then(response => response.json())
  .then(data => {
    if (data.token) {
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userName', name);
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      // Show error message
      alert(data.message || 'Registration failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Registration error:', error);
    alert('An error occurred during registration. Please try again.');
  });
}

// Handle order form submission
function handleOrderSubmission(event) {
  event.preventDefault();
  
  // Check if user is logged in
  if (!checkAuth()) {
    alert('Please log in to place an order');
    window.location.href = 'login.html';
    return;
  }
  
  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone').value;
  const service_type = document.getElementById('service').value;
  const material = document.getElementById('material').value;
  const description = document.getElementById('description').value;
  const needs_design = document.querySelector('input[name="designService"]:checked').value;
  const file = document.getElementById('file').files[0];
  
  const formData = new FormData();
  formData.append('service_type', service_type);
  formData.append('material', material);
  formData.append('description', description);
  formData.append('needs_design', needs_design);
  
  if (file) {
    formData.append('file', file);
  }
  
  // Get JWT token from local storage
  const token = localStorage.getItem('token');
  
  fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.orderId) {
      alert(`Order placed successfully! Your total is $${data.totalPrice.toFixed(2)}`);
      document.getElementById('orderForm').reset();
      
      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      alert(data.message || 'Failed to place order. Please try again.');
    }
  })
  .catch(error => {
    console.error('Order submission error:', error);
    alert('An error occurred while submitting your order. Please try again.');
  });
}

// Handle contact form submission
function handleContactSubmission(event) {
  event.preventDefault();
  
  const name = document.getElementById('contactName').value;
  const email = document.getElementById('contactEmail').value;
  const subject = document.getElementById('contactSubject').value;
  const message = document.getElementById('contactMessage').value;
  
  fetch(`${API_URL}/contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, email, subject, message })
  })
  .then(response => response.json())
  .then(data => {
    if (data.messageId) {
      alert('Message sent successfully! We will get back to you soon.');
      document.getElementById('contactForm').reset();
    } else {
      alert(data.message || 'Failed to send message. Please try again.');
    }
  })
  .catch(error => {
    console.error('Contact submission error:', error);
    alert('An error occurred while sending your message. Please try again.');
  });
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  window.location.href = 'index.html';
}

// Load user dashboard
function loadDashboard() {
  // Check if user is logged in
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  
  // Update welcome message
  document.getElementById('welcomeMessage').textContent = `Welcome, ${userName}!`;
  
  // Fetch dashboard data
  fetch(`${API_URL}/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    // Update dashboard summary
    document.getElementById('totalOrders').textContent = data.summary.total_orders || 0;
    document.getElementById('activeOrders').textContent = data.summary.active_orders || 0;
    document.getElementById('completedOrders').textContent = data.summary.completed_orders || 0;
    document.getElementById('totalSpent').textContent = `$${(data.summary.total_spent || 0).toFixed(2)}`;
    
    // Populate recent orders
    const ordersContainer = document.getElementById('recentOrders');
    ordersContainer.innerHTML = '';
    
    if (data.recentOrders && data.recentOrders.length > 0) {
      data.recentOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        orderCard.innerHTML = `
          <div class="order-header">
            <h5>Order #${order.id}</h5>
            <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
          </div>
          <div class="order-details">
            <p><strong>Service:</strong> ${order.service_type}</p>
            <p><strong>Material:</strong> ${order.material}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Price:</strong> $${order.total_price.toFixed(2)}</p>
          </div>
          <div class="order-actions">
            <a href="order-details.html?id=${order.id}" class="btn btn-sm btn-primary">View Details</a>
          </div>
        `;
        ordersContainer.appendChild(orderCard);
      });
    } else {
      ordersContainer.innerHTML = '<p>No orders yet. <a href="order.html">Place your first order</a></p>';
    }
  })
  .catch(error => {
    console.error('Dashboard loading error:', error);
    alert('Failed to load dashboard data. Please try again.');
  });
}

// Helper function to get badge class based on order status
function getStatusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'badge-warning';
    case 'processing':
      return 'badge-info';
    case 'completed':
      return 'badge-success';
    case 'cancelled':
      return 'badge-danger';
    default:
      return 'badge-secondary';
  }
}

// Load user profile
function loadProfile() {
  // Check if user is logged in
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  
  const token = localStorage.getItem('token');
  
  // Fetch user profile
  fetch(`${API_URL}/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    // Populate profile form
    document.getElementById('profileName').value = data.name || '';
    document.getElementById('profileEmail').value = data.email || '';
    document.getElementById('profileEmail').disabled = true; // Email cannot be changed
    document.getElementById('profilePhone').value = data.phone || '';
  })
  .catch(error => {
    console.error('Profile loading error:', error);
    alert('Failed to load profile data. Please try again.');
  });
}

// Handle profile update
function handleProfileUpdate(event) {
  event.preventDefault();
  
  const token = localStorage.getItem('token');
  const name = document.getElementById('profileName').value;
  const phone = document.getElementById('profilePhone').value;
  
  fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, phone })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message) {
      alert('Profile updated successfully');
      localStorage.setItem('userName', name);
    } else {
      alert(data.message || 'Failed to update profile. Please try again.');
    }
  })
  .catch(error => {
    console.error('Profile update error:', error);
    alert('An error occurred while updating your profile. Please try again.');
  });
}

// Handle password change
function handlePasswordChange(event) {
  event.preventDefault();
  
  const token = localStorage.getItem('token');
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;
  
  // Validate password match
  if (newPassword !== confirmPassword) {
    alert('New passwords do not match');
    return;
  }
  
  fetch(`${API_URL}/change-password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentPassword, newPassword })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message === 'Password updated successfully') {
      alert('Password changed successfully');
      document.getElementById('passwordForm').reset();
    } else {
      alert(data.message || 'Failed to change password. Please try again.');
    }
  })
  .catch(error => {
    console.error('Password change error:', error);
    alert('An error occurred while changing your password. Please try again.');
  });
}

// Load order details
function loadOrderDetails() {
  // Check if user is logged in
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  
  // Get order ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('id');
  
  if (!orderId) {
    window.location.href = 'dashboard.html';
    return;
  }
  
  const token = localStorage.getItem('token');
  
  // Fetch order details
  fetch(`${API_URL}/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(order => {
    // Populate order details
    document.getElementById('orderIdDisplay').textContent = `#${order.id}`;
    document.getElementById('orderDate').textContent = new Date(order.created_at).toLocaleDateString();
    document.getElementById('orderStatus').textContent = order.status;
    document.getElementById('orderStatus').className = `badge ${getStatusBadgeClass(order.status)}`;
    document.getElementById('orderService').textContent = order.service_type;
    document.getElementById('orderMaterial').textContent = order.material;
    document.getElementById('orderDescription').textContent = order.description || 'No description provided';
    document.getElementById('orderDesignService').textContent = order.needs_design ? 'Yes' : 'No';
    document.getElementById('orderPrice').textContent = `$${order.total_price.toFixed(2)}`;
    
    // Show/hide action buttons based on order status
    const actionButtons = document.getElementById('orderActions');
    if (order.status === 'pending') {
      actionButtons.innerHTML = `
        <button onclick="editOrder(${order.id})" class="btn btn-sm btn-primary">Edit Order</button>
        <button onclick="cancelOrder(${order.id})" class="btn btn-sm btn-danger">Cancel Order</button>
      `;
    } else {
      actionButtons.innerHTML = '';
    }
  })
  .catch(error => {
    console.error('Order details loading error:', error);
    alert('Failed to load order details. Please try again.');
  });
}

// Edit order (just redirects to edit page)
function editOrder(orderId) {
  window.location.href = `edit-order.html?id=${orderId}`;
}

// Cancel order
function cancelOrder(orderId) {
  if (!confirm('Are you sure you want to cancel this order?')) {
    return;
  }
  
  const token = localStorage.getItem('token');
  
  fetch(`${API_URL}/orders/${orderId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.message === 'Order cancelled successfully') {
      alert('Order cancelled successfully');
      window.location.href = 'dashboard.html';
    } else {
      alert(data.message || 'Failed to cancel order. Please try again.');
    }
  })
  .catch(error => {
    console.error('Order cancellation error:', error);
    alert('An error occurred while cancelling your order. Please try again.');
  });
}

// Load all orders for My Orders page
function loadAllOrders() {
  // Check if user is logged in
  if (!checkAuth()) {
    window.location.href = 'login.html';
    return;
  }
  
  const token = localStorage.getItem('token');
  
  // Fetch all orders
  fetch(`${API_URL}/orders`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(orders => {
    const ordersContainer = document.getElementById('ordersContainer');
    ordersContainer.innerHTML = '';
    
    if (orders && orders.length > 0) {
      orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        orderCard.innerHTML = `
          <div class="order-header">
            <h5>Order #${order.id}</h5>
            <span class="badge ${getStatusBadgeClass(order.status)}">${order.status}</span>
          </div>
          <div class="order-details">
            <p><strong>Service:</strong> ${order.service_type}</p>
            <p><strong>Material:</strong> ${order.material}</p>
            <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Price:</strong> $${order.total_price.toFixed(2)}</p>
          </div>
          <div class="order-actions">
            <a href="order-details.html?id=${order.id}" class="btn btn-sm btn-primary">View Details</a>
          </div>
        `;
        ordersContainer.appendChild(orderCard);
      });
    } else {
      ordersContainer.innerHTML = '<p>No orders yet. <a href="order.html">Place your first order</a></p>';
    }
  })
  .catch(error => {
    console.error('Orders loading error:', error);
    alert('Failed to load orders data. Please try again.');
  });
}

// Price calculator for order page
function updatePriceEstimate() {
  const material = document.getElementById('material').value;
  const needsDesign = document.querySelector('input[name="designService"]:checked').value;
  
  let basePrice = 0;
  
  switch (material) {
    case 'pla':
      basePrice = 10;
      break;
    case 'abs':
    case 'petg':
      basePrice = 18;
      break;
    case 'resin':
    case 'nylon':
    case 'metal':
      basePrice = 25;
      break;
    default:
      basePrice = 15;
  }
  
  // Adjust price based on service
  let finalPrice = basePrice;
  if (needsDesign === 'yes') {
    finalPrice += 50; // Add design fee
  }
  
  document.getElementById('priceEstimate').textContent = `$${finalPrice.toFixed(2)}`;
}

// Load material info on service page
function loadMaterialInfo() {
  const materials = {
    pla: {
      name: 'PLA',
      description: 'Biodegradable and easy to print. Great for decorative items, prototypes, and low-stress applications.',
      strength: 'Medium',
      flexibility: 'Low',
      durability: 'Medium',
      price: '$10 base price'
    },
    abs: {
      name: 'ABS',
      description: 'Strong and impact-resistant. Good for functional parts that need to withstand moderate stress.',
      strength: 'High',
      flexibility: 'Medium',
      durability: 'High',
      price: '$18 base price'
    },
    petg: {
      name: 'PETG',
      description: 'Combines strength of ABS with ease of printing like PLA. Good for mechanical parts and water-resistant applications.',
      strength: 'High',
      flexibility: 'Medium',
      durability: 'High',
      price: '$18 base price'
    },
    resin: {
      name: 'Resin',
      description: 'Superior detail and smooth finish. Ideal for miniatures, jewelry, and highly detailed models.',
      strength: 'Medium',
      flexibility: 'Low',
      durability: 'Medium',
      price: '$25 base price'
    },
    nylon: {
      name: 'Nylon',
      description: 'Extremely durable and flexible. Perfect for functional parts that need to bend without breaking.',
      strength: 'Very High',
      flexibility: 'High',
      durability: 'Very High',
      price: '$25 base price'
    },
    metal: {
      name: 'Metal (Steel/Aluminum)',
      description: 'For industrial-grade parts that need maximum strength and heat resistance.',
      strength: 'Extremely High',
      flexibility: 'Low',
      durability: 'Extremely High',
      price: '$25 base price + additional costs based on weight'
    }
  };
  
  const materialSelect = document.getElementById('materialSelect');
  const materialInfo = document.getElementById('materialInfo');
  
  materialSelect.addEventListener('change', function() {
    const selectedMaterial = materials[this.value];
    
    if (selectedMaterial) {
      materialInfo.innerHTML = `
        <h3>${selectedMaterial.name}</h3>
        <p>${selectedMaterial.description}</p>
        <ul>
          <li><strong>Strength:</strong> ${selectedMaterial.strength}</li>
          <li><strong>Flexibility:</strong> ${selectedMaterial.flexibility}</li>
          <li><strong>Durability:</strong> ${selectedMaterial.durability}</li>
          <li><strong>Price:</strong> ${selectedMaterial.price}</li>
        </ul>
      `;
    } else {
      materialInfo.innerHTML = '<p>Please select a material to see details.</p>';
    }
  });
  
  // Initialize with first material
  if (materialSelect) {
    materialSelect.dispatchEvent(new Event('change'));
  }
}

// Initialize page based on URL
document.addEventListener('DOMContentLoaded', function() {
  // Run checkAuth on every page
  checkAuth();
  
  // Page-specific initializations
  const currentPath = window.location.pathname;
  
  if (currentPath.includes('login.html')) {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }
  }
  
  if (currentPath.includes('register.html')) {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', handleRegistration);
    }
  }
  
  if (currentPath.includes('order.html')) {
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
      orderForm.addEventListener('submit', handleOrderSubmission);
    }
    
    // Setup price estimate calculator
    const materialSelect = document.getElementById('material');
    const designOptions = document.querySelectorAll('input[name="designService"]');
    
    if (materialSelect && designOptions.length > 0) {
      materialSelect.addEventListener('change', updatePriceEstimate);
      designOptions.forEach(option => {
        option.addEventListener('change', updatePriceEstimate);
      });
      
      // Initialize price estimate
      updatePriceEstimate();
    }
  }
  
  if (currentPath.includes('contact.html')) {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', handleContactSubmission);
    }
  }
  
  if (currentPath.includes('dashboard.html')) {
    loadDashboard();
  }
  
  if (currentPath.includes('profile.html')) {
    loadProfile();
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', handlePasswordChange);
    }
  }
  
  if (currentPath.includes('order-details.html')) {
    loadOrderDetails();
  }
  
  if (currentPath.includes('my-orders.html')) {
    loadAllOrders();
  }
  
  if (currentPath.includes('services.html') || currentPath.includes('materials.html')) {
    loadMaterialInfo();
  }
  
  // Setup logout buttons
  const logoutButtons = document.querySelectorAll('.logout-button');
  logoutButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      logout();
    });
  });
});