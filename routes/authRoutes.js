const router = require('express').Router();
const { users, orders } = require('../data/store');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const identifier = (req.body.email || req.body.username || '').trim().toLowerCase();
  const password = req.body.password;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required' });
  }

  const user = users.find(
    (u) =>
      (u.email.toLowerCase() === identifier || u.name.toLowerCase() === identifier) &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid email/username or password' });
  }

  // Return user without password
  const { password: _, ...safeUser } = user;
  res.status(200).json({
    message: 'Login successful',
    user: safeUser,
  });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    email: cleanEmail,
    password: password,
    role: 'user',
    phone: phone ? phone.trim() : '+91 98200 00000',
    joinedDate: new Date().toISOString().split('T')[0],
  };

  users.push(newUser);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({
    message: 'Account created successfully',
    user: safeUser,
  });
});

// GET /api/auth/users (for Admin Customers Management)
router.get('/users', (req, res) => {
  const customerList = users
    .filter((u) => u.role === 'user')
    .map((u) => {
      // Calculate order statistics for this user
      const userOrders = orders.filter(
        (o) =>
          o.userId === u.id ||
          (o.userEmail && o.userEmail.toLowerCase() === u.email.toLowerCase()) ||
          (o.customerName && o.customerName.toLowerCase() === u.name.toLowerCase())
      );

      const totalSpent = userOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      const lastOrder = userOrders[userOrders.length - 1];

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        joinedDate: u.joinedDate,
        totalOrders: userOrders.length,
        totalSpent,
        lastOrder: lastOrder ? `${lastOrder.item} (${lastOrder.time})` : 'None',
      };
    });

  res.status(200).json(customerList);
});

// GET /api/auth/me/:id
router.get('/me/:id', (req, res) => {
  const user = users.find((u) => u.id === +req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...safeUser } = user;
  res.status(200).json(safeUser);
});

module.exports = router;
