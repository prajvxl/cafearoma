const router = require('express').Router();
const { orders } = require('../data/store');

// GET all orders (supports optional ?userId=... or ?email=... or ?status=...)
router.get('/', (req, res) => {
  const { userId, email, status } = req.query;
  let result = orders;

  if (userId) {
    result = result.filter((o) => o.userId === +userId);
  } else if (email) {
    result = result.filter(
      (o) => o.userEmail && o.userEmail.toLowerCase() === email.toLowerCase()
    );
  }

  if (status && status !== 'All') {
    result = result.filter(
      (o) => (o.status || '').toLowerCase() === status.toLowerCase()
    );
  }

  res.status(200).json(result);
});

// GET single order by ID
router.get('/:id', (req, res) => {
  const order = orders.find((o) => o.id === +req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.status(200).json(order);
});

// POST create order (supports both single item and cart items)
router.post('/', (req, res) => {
  const { customerName, locationId, item, time } = req.body;

  if (!customerName || !locationId || !item || !time) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  const order = {
    id: Date.now(),
    userId: req.body.userId ? Number(req.body.userId) : null,
    userEmail: req.body.userEmail || null,
    customerName: customerName.trim(),
    locationId: Number(locationId),
    item: item.trim(),
    items: req.body.items || [
      {
        name: item.trim(),
        quantity: Number(req.body.quantity) || 1,
        price: Number(req.body.amount) || 180,
      },
    ],
    quantity: Number(req.body.quantity) || 1,
    amount: Number(req.body.amount) || 180,
    time: time.trim(),
    status: req.body.status || 'Pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  res.status(201).json(order);
});

// PUT update order (e.g. status)
router.put('/:id', (req, res) => {
  const order = orders.find((o) => o.id === +req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  Object.assign(order, req.body);
  res.status(200).json(order);
});

// DELETE cancel / delete order
router.delete('/:id', (req, res) => {
  const idx = orders.findIndex((o) => o.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });

  const [deleted] = orders.splice(idx, 1);
  res.status(200).json(deleted);
});

module.exports = router;
