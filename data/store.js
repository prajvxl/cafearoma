// In-memory data store — keeps this practical focused purely on REST
// principles, routing, status codes, and validation (Mongoose/MongoDB
// is used separately in Practical 6).

let cafe = {
  id: 1,
  name: 'Cafe Aroma',
  tagline: 'Specialty coffee & cloud kitchen',
  location: 'Navi Mumbai',
  rating: 4.7,
  statement: 'We roast, brew, and bake fresh every single day for pickup near you.',
};

let locations = [
  { id: 1, name: 'Cafe Aroma - Panvel', address: 'Plot 2A, Panvel', rating: 4.7 },
  { id: 2, name: 'Cafe Aroma - Kamothe', address: 'Sector 12, Kamothe', rating: 4.6 },
  { id: 3, name: 'Cafe Aroma - Nerul', address: 'Sector 19, Nerul', rating: 4.8 },
];

let orders = [];
let reviews = [];

module.exports = { cafe, locations, orders, reviews };
