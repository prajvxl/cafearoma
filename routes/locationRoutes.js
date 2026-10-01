const router = require('express').Router();
const { locations } = require('../data/store');

router.get('/', (req, res) => res.status(200).json(locations));

router.get('/:id', (req, res) => {
  const loc = locations.find((l) => l.id === +req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  res.status(200).json(loc);
});

router.post('/', (req, res) => {
  const newLocation = { id: Date.now(), ...req.body };
  locations.push(newLocation);
  res.status(201).json(newLocation);
});

router.put('/:id', (req, res) => {
  const loc = locations.find((l) => l.id === +req.params.id);
  if (!loc) return res.status(404).json({ error: 'Location not found' });
  Object.assign(loc, req.body);
  res.status(200).json(loc);
});

router.delete('/:id', (req, res) => {
  const idx = locations.findIndex((l) => l.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Location not found' });
  const [deleted] = locations.splice(idx, 1);
  res.status(200).json(deleted);
});

module.exports = router;
