const BASE = '/api';

function logCall(method, url, status) {
  const li = document.createElement('li');
  li.textContent = `[${new Date().toLocaleTimeString()}] ${method} ${url} -> ${status}`;
  document.getElementById('logList').prepend(li);
}

async function apiCall(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  logCall(method, url, res.status);
  return res.json();
}

async function loadCafe() {
  const cafe = await apiCall('GET', `${BASE}/cafe`);
  document.getElementById('cafeName').textContent = cafe.name;
  document.getElementById('cafeStatement').textContent = cafe.statement;
  document.getElementById('cafeRating').textContent = cafe.rating;
  document.getElementById('cafeLocation').textContent = cafe.location;
}

async function loadLocations() {
  const locations = await apiCall('GET', `${BASE}/locations`);
  const container = document.getElementById('locationCards');
  const select = document.getElementById('locationSelect');
  container.innerHTML = locations
    .map((l) => `<div class="card"><strong>${l.name}</strong><br>${l.address}<br>Rating: ${l.rating}</div>`)
    .join('');
  select.innerHTML = locations.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
}

async function loadOrders() {
  const orders = await apiCall('GET', `${BASE}/orders`);
  document.getElementById('ordersList').innerHTML = orders
    .map((o) => `<li>#${o.id} — ${o.customerName} — ${o.item} — ${o.time} — <strong>${o.status}</strong></li>`)
    .join('');
}

async function loadReviews() {
  const reviews = await apiCall('GET', `${BASE}/reviews`);
  document.getElementById('reviewsList').innerHTML = reviews
    .map((r) => `<li>"${r.comment}" — ${r.author}</li>`)
    .join('');
}

document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    customerName: document.getElementById('customerName').value,
    locationId: Number(document.getElementById('locationSelect').value),
    item: document.getElementById('itemInput').value,
    time: document.getElementById('timeInput').value,
  };
  await apiCall('POST', `${BASE}/orders`, body);
  e.target.reset();
  loadOrders();
});

document.getElementById('orderBtn').addEventListener('click', () => {
  document.querySelector('.order-form').scrollIntoView({ behavior: 'smooth' });
});

loadCafe();
loadLocations();
loadOrders();
loadReviews();
