// server.js - Main server file
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Orders table
    db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        service_type TEXT NOT NULL,
        material TEXT NOT NULL,
        description TEXT,
        needs_design INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        file_path TEXT,
        total_price REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Messages table
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
}

// Secret key for JWT
const JWT_SECRET = 'your_jwt_secret';

// Middleware to authenticate JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  });
}

// API Routes

// Register a new user
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Check if email already exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      if (row) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Insert new user
      db.run(
        'INSERT INTO users (name, email, password, phone) VALUES (?, ?, ?, ?)',
        [name, email, hashedPassword, phone],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Failed to register user', error: err.message });
          }
          
          // Generate JWT token
          const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '24h' });
          
          res.status(201).json({ 
            message: 'User registered successfully',
            token,
            userId: this.lastID
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Generate JWT token
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ 
        message: 'Login successful',
        token,
        userId: user.id,
        name: user.name
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new order
app.post('/api/orders', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const { 
      service_type, 
      material, 
      description, 
      needs_design 
    } = req.body;
    
    const userId = req.user.id;
    const filePath = req.file ? req.file.path : null;
    
    // Calculate price (this would be more sophisticated in a real app)
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
    if (needs_design === 'yes') {
      finalPrice += 50; // Add design fee
    }
    
    // Insert new order
    db.run(
      `INSERT INTO orders 
       (user_id, service_type, material, description, needs_design, file_path, total_price) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, service_type, material, description, needs_design === 'yes' ? 1 : 0, filePath, finalPrice],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to create order', error: err.message });
        }
        
        res.status(201).json({ 
          message: 'Order created successfully',
          orderId: this.lastID,
          totalPrice: finalPrice
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user orders
app.get('/api/orders', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
      }
      
      res.json(rows);
    }
  );
});

// Get order by ID
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  
  db.get(
    `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
    [orderId, userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to fetch order', error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      res.json(row);
    }
  );
});

// Update order
app.put('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const { description } = req.body;
  
  // Only allow updating if order is still pending
  db.run(
    `UPDATE orders SET description = ? WHERE id = ? AND user_id = ? AND status = 'pending'`,
    [description, orderId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to update order', error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ 
          message: 'Order not found or cannot be updated anymore'
        });
      }
      
      res.json({ message: 'Order updated successfully' });
    }
  );
});

// Cancel order
app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  
  // Only allow cancellation if order is still pending
  db.run(
    `UPDATE orders SET status = 'cancelled' WHERE id = ? AND user_id = ? AND status = 'pending'`,
    [orderId, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to cancel order', error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ 
          message: 'Order not found or cannot be cancelled anymore'
        });
      }
      
      res.json({ message: 'Order cancelled successfully' });
    }
  );
});

// Submit contact message
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    db.run(
      'INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      [name, email, subject, message],
      function(err) {
        if (err) {
          return res.status(500).json({ message: 'Failed to send message', error: err.message });
        }
        
        res.status(201).json({ 
          message: 'Message sent successfully',
          messageId: this.lastID
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    'SELECT id, name, email, phone, created_at FROM users WHERE id = ?',
    [userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
      }
      
      if (!row) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(row);
    }
  );
});

// Update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { name, phone } = req.body;
  
  db.run(
    'UPDATE users SET name = ?, phone = ? WHERE id = ?',
    [name, phone, userId],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Failed to update profile', error: err.message });
      }
      
      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Change password
app.put('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    // Get current user data
    db.get('SELECT * FROM users WHERE id = ?', [userId], async (err, user) => {
      if (err) {
        return res.status(500).json({ message: 'Database error', error: err.message });
      }
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId],
        function(err) {
          if (err) {
            return res.status(500).json({ message: 'Failed to update password', error: err.message });
          }
          
          res.json({ message: 'Password updated successfully' });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard summary
app.get('/api/dashboard', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT 
       COUNT(*) as total_orders,
       COUNT(CASE WHEN status = 'pending' OR status = 'processing' THEN 1 END) as active_orders,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
       SUM(total_price) as total_spent
     FROM orders 
     WHERE user_id = ?`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to fetch dashboard data', error: err.message });
      }
      
      // Get recent orders
      db.all(
        `SELECT * FROM orders 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [userId],
        (err, recentOrders) => {
          if (err) {
            return res.status(500).json({ message: 'Failed to fetch recent orders', error: err.message });
          }
          
          res.json({
            summary: rows[0],
            recentOrders
          });
        }
      );
    }
  );
});

// Serve frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
