const router = require('express').Router();
const { orders, menu } = require('../data/store');

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

// POST create order — proper checkout validation & server-side price calculation
router.post('/', (req, res) => {
  const {
    customerName,
    phone,
    deliveryAddress,
    locationNote,
    locationId,
    items,          // Array of { id, name, price, quantity }
    paymentMethod,  // 'COD' | 'Online'
    orderType,      // 'Pickup' | 'Delivery'
    time,
    // Legacy single-item fields (for backward compatibility with admin modal / direct tests)
    item,
  } = req.body;

  // 1. Validate Customer Name
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ error: 'Full customer name is required' });
  }

  // 2. Validate Phone Number (must be valid 7-15 digits)
  const cleanPhone = (phone || '').trim();
  if (!cleanPhone || !/^\+?[\d\s\-()]{7,16}$/.test(cleanPhone)) {
    return res.status(400).json({ error: 'A valid contact phone number is required (min 7 digits)' });
  }

  // 3. Validate Delivery / Pickup Address
  const cleanAddress = (deliveryAddress || '').trim();
  if (!cleanAddress) {
    return res.status(400).json({ error: 'Delivery address / pickup location is required' });
  }

  // 4. Validate Location Outlet
  const parsedLocId = Number(locationId);
  if (!parsedLocId || isNaN(parsedLocId)) {
    return res.status(400).json({ error: 'Please select a valid Cafe Aroma outlet' });
  }

  // 5. Validate Payment Method
  const validPaymentMethod = paymentMethod === 'Online' ? 'Online' : 'COD';

  // 6. Validate & Calculate Items on Server (security & integrity check)
  let orderItems = [];
  let serverSubtotal = 0;

  if (Array.isArray(items) && items.length > 0) {
    for (const ci of items) {
      const menuItem = menu.find((m) => m.id === Number(ci.id));
      if (!menuItem) {
        return res.status(400).json({ error: `Menu item with ID "${ci.id}" was not found in our catalog` });
      }
      if (menuItem.available === false) {
        return res.status(400).json({ error: `"${menuItem.name}" is currently sold out / unavailable` });
      }
      const qty = Math.max(1, Math.min(50, Number(ci.quantity) || 1));
      orderItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
        itemTotal: menuItem.price * qty,
      });
      serverSubtotal += menuItem.price * qty;
    }
  } else if (item && item.trim()) {
    // Legacy fallback: single item name
    const menuItem = menu.find((m) => m.name.toLowerCase() === item.trim().toLowerCase());
    const unitPrice = menuItem ? menuItem.price : Math.max(50, Number(req.body.amount) || 150);
    const qty = Math.max(1, Number(req.body.quantity) || 1);
    orderItems = [{
      id: menuItem ? menuItem.id : 1,
      name: item.trim(),
      price: unitPrice,
      quantity: qty,
      itemTotal: unitPrice * qty,
    }];
    serverSubtotal = unitPrice * qty;
  } else {
    return res.status(400).json({ error: 'Cannot place an empty order. Please select at least one item.' });
  }

  // 7. Calculate GST (5%) and Delivery Charge
  const isDelivery = orderType === 'Delivery' || (cleanAddress && !cleanAddress.toLowerCase().includes('counter'));
  const deliveryFee = isDelivery ? 30 : 0;
  const gstAmount = Math.round(serverSubtotal * 0.05);
  const grandTotal = serverSubtotal + gstAmount + deliveryFee;

  // 8. Payment Status
  // For online payment in this college project: if client passes onlinePaymentVerified, mark Paid; otherwise Pending
  const isOnlineVerified = req.body.onlinePaymentVerified === true;
  const paymentStatus = validPaymentMethod === 'Online'
    ? (isOnlineVerified ? 'Paid (Online)' : 'Pending Verification')
    : 'Cash on Delivery';

  // 9. Build Order Record (initial status is always 'Pending')
  const order = {
    id: Date.now(),
    userId: req.body.userId ? Number(req.body.userId) : null,
    userEmail: req.body.userEmail || null,
    customerName: customerName.trim(),
    phone: cleanPhone,
    deliveryAddress: cleanAddress,
    locationNote: (locationNote || '').trim(),
    locationId: parsedLocId,
    orderType: isDelivery ? 'Delivery' : 'Pickup',
    items: orderItems,
    item: orderItems.map((i) => `${i.name} × ${i.quantity}`).join(', '),
    quantity: orderItems.reduce((acc, i) => acc + i.quantity, 0),
    subtotal: serverSubtotal,
    gst: gstAmount,
    deliveryFee,
    amount: grandTotal,
    paymentMethod: validPaymentMethod,
    paymentStatus,
    time: (time || '').trim() || 'Express (15-20 mins)',
    status: 'Pending', // New orders ALWAYS start as Pending for admin review
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  res.status(201).json(order);
});

// PUT update order (e.g. status, paymentStatus)
router.put('/:id', (req, res) => {
  const order = orders.find((o) => o.id === +req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Update allowed fields
  if (req.body.status) order.status = req.body.status;
  if (req.body.paymentStatus) order.paymentStatus = req.body.paymentStatus;
  if (req.body.time) order.time = req.body.time;

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
