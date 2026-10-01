const router = require('express').Router();
const { orders } = require('../data/store');

router.get('/', (req, res) => res.status(200).json(orders));

router.post('/', (req, res) => {
  const { customerName, locationId, item, time } = req.body;

  if (!customerName || !locationId || !item || !time) {
    return res.status(400).json({ error: 'Missing required order fields' });
  }

  const order = {
    id: Date.now(),
    customerName,
    locationId,
    item,
    time,
    status: 'pending',
  };
  orders.push(order);
  res.status(201).json(order);
});

router.put('/:id', (req, res) => {
  const order = orders.find((o) => o.id === +req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  Object.assign(order, req.body);
  res.status(200).json(order);
});

router.delete('/:id', (req, res) => {
  const idx = orders.findIndex((o) => o.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  const [deleted] = orders.splice(idx, 1);
  res.status(200).json(deleted);
});

module.exports = router;
