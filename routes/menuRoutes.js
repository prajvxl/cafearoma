const router = require('express').Router();
const { menu } = require('../data/store');

// GET all menu items (optional filter by category)
router.get('/', (req, res) => {
  const { category, search } = req.query;
  let items = menu;

  if (category && category !== 'All') {
    items = items.filter(
      (m) => m.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
    );
  }

  res.status(200).json(items);
});

// GET single menu item by ID
router.get('/:id', (req, res) => {
  const item = menu.find((m) => m.id === +req.params.id);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });
  res.status(200).json(item);
});

// POST new menu item
router.post('/', (req, res) => {
  const { name, price, category } = req.body;
  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: 'Name, price, and category are required' });
  }

  const newItem = {
    id: Date.now(),
    name: name.trim(),
    price: Number(price),
    category: category.trim(),
    available: req.body.available !== undefined ? Boolean(req.body.available) : true,
    description: req.body.description ? req.body.description.trim() : 'Freshly prepared specialty item',
    image: req.body.image || 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80',
  };

  menu.push(newItem);
  res.status(201).json(newItem);
});

// PUT update menu item
router.put('/:id', (req, res) => {
  const item = menu.find((m) => m.id === +req.params.id);
  if (!item) return res.status(404).json({ error: 'Menu item not found' });

  if (req.body.name !== undefined) item.name = req.body.name.trim();
  if (req.body.price !== undefined) item.price = Number(req.body.price);
  if (req.body.category !== undefined) item.category = req.body.category.trim();
  if (req.body.available !== undefined) item.available = Boolean(req.body.available);
  if (req.body.description !== undefined) item.description = req.body.description.trim();
  if (req.body.image !== undefined) item.image = req.body.image;

  res.status(200).json(item);
});

// DELETE menu item
router.delete('/:id', (req, res) => {
  const idx = menu.findIndex((m) => m.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Menu item not found' });
  const [deleted] = menu.splice(idx, 1);
  res.status(200).json({ message: 'Menu item deleted', deleted });
});

module.exports = router;
