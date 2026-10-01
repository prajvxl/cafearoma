const router = require('express').Router();
const { cafe } = require('../data/store');

router.get('/', (req, res) => res.status(200).json(cafe));

router.put('/', (req, res) => {
  Object.assign(cafe, req.body);
  res.status(200).json({ message: 'Cafe profile updated', cafe });
});

module.exports = router;
