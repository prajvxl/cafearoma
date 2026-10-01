const router = require('express').Router();
const { reviews } = require('../data/store');

router.get('/', (req, res) => res.status(200).json(reviews));

router.post('/', (req, res) => {
  const newReview = { id: Date.now(), ...req.body };
  reviews.push(newReview);
  res.status(201).json(newReview);
});

router.delete('/:id', (req, res) => {
  const idx = reviews.findIndex((r) => r.id === +req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Review not found' });
  const [deleted] = reviews.splice(idx, 1);
  res.status(200).json(deleted);
});

module.exports = router;
