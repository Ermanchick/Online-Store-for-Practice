// Корзина и пользователь
let cart = [], user = null;

// Инициализация
async function init() {
    user = (await fetch('/api/user').then(r => r.json())).user;
    loadCart();
    renderProducts('featured-products', '/api/products/featured');
    renderProducts('products-grid', '/api/products');
    renderCart();
    updateCount();
    document.querySelectorAll('.category-filter, .filters input').forEach(c => c.onchange = filterProducts);
}

// Загрузка корзины из localStorage
function loadCart() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Отображение товаров
async function renderProducts(elId, url) {
    const el = document.getElementById(elId);
    if (!el) return;
    const products = await fetch(url).then(r => r.json());
    el.innerHTML = products.map(p => `<div class="product-card" data-category="${p.category}" data-id="${p.id}">
        <img src="${p.image}">
        <div class="info">
            <div class="category">${getCat(p.category)}</div>
            <h3>${p.name}</h3>
            <div class="price">${p.price.toLocaleString()} ₽</div>
            <button class="btn btn-primary" onclick="addToCart(${p.id})">В корзину</button>
        </div>
    </div>`).join('');
    document.querySelectorAll('.product-card').forEach(c => c.onclick = e => {
        if (e.target.tagName === 'BUTTON') return;
        showModal(c.dataset.id);
    });
}

// Категории
function getCat(c) {
    return { laptop: 'Ноутбуки', phone: 'Смартфоны', tv: 'Телевизоры', audio: 'Наушники', pc: 'ПК', tablet: 'Планшеты', watch: 'Часы', camera: 'Фотоаппараты' }[c] || c;
}

// Модальное окно товара
async function showModal(id) {
    const p = await fetch(`/api/products/${id}`).then(r => r.json());
    if (!p) return;
    const modal = document.getElementById('product-modal');
    modal.querySelector('#modal-image').src = p.image;
    modal.querySelector('#modal-name').textContent = p.name;
    modal.querySelector('#modal-category').textContent = getCat(p.category);
    modal.querySelector('#modal-price').textContent = p.price.toLocaleString() + ' ₽';
    modal.querySelector('#modal-description').textContent = p.description;
    modal.querySelector('#modal-add-btn').onclick = () => { addToCart(p.id); modal.classList.remove('active'); };
    modal.classList.add('active');
}

// Фильтр товаров
function filterProducts() {
    const checked = [...document.querySelectorAll('.category-filter:checked')].map(c => c.value);
    document.querySelectorAll('.product-card').forEach(c => c.style.display = !checked.length || checked.includes(c.dataset.category) ? '' : 'none');
}

// Добавить в корзину
function addToCart(id) {
    fetch(`/api/products/${id}`).then(r => r.json()).then(p => {
        const existing = cart.find(i => i.id === p.id);
        existing ? existing.quantity++ : cart.push({ ...p, quantity: 1 });
        saveCart();
        updateCount();
        renderCart();
    });
}

// Отображение корзины
function renderCart() {
    const el = document.getElementById('cart-items');
    const empty = document.getElementById('cart-empty');
    const summary = document.getElementById('cart-summary');
    if (!el) return;
    if (!cart.length) return empty && (empty.style.display = 'block', el.style.display = 'none', summary && (summary.style.display = 'none'));
    empty && (empty.style.display = 'none', el.style.display = 'block', summary && (summary.style.display = 'block'));
    el.innerHTML = cart.map((item, i) => `<div class="cart-item">
        <img src="${item.image}">
        <div class="details"><h4>${item.name}</h4><p>${item.price.toLocaleString()} ₽</p></div>
        <div class="actions">
            <button onclick="changeQty(${i}, -1)">-</button><span>${item.quantity}</span><button onclick="changeQty(${i}, 1)">+</button>
            <button class="remove" onclick="remove(${i})">Удалить</button>
        </div>
    </div>`).join('');
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    document.getElementById('cart-total').textContent = total.toLocaleString() + ' ₽';
    document.getElementById('cart-items-count').textContent = count;
}

// Изменить количество
function changeQty(i, d) {
    cart[i].quantity += d;
    cart[i].quantity < 1 ? cart.splice(i, 1) : saveCart();
    updateCount();
    renderCart();
}

// Удалить из корзины
function remove(i) { cart.splice(i, 1); saveCart(); updateCount(); renderCart(); }

// Обновить счетчик
function updateCount() {
    document.querySelectorAll('#cart-count').forEach(e => e.textContent = cart.reduce((s, i) => s + i.quantity, 0));
}

// Оформить заказ
async function checkout() {
    if (!user) return window.location.href = '/login';
    if (!cart.length) return alert('Корзина пуста!');
    const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cart, total }) }).then(r => r.json());
    if (r.success) alert(`Заказ #${r.orderId} оформлен!`), cart = [], saveCart(), updateCount(), renderCart();
}

// Запуск
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('click', e => {
    e.target.id === 'checkout-btn' && checkout();
    e.target.id === 'product-modal-close' && document.getElementById('product-modal').classList.remove('active');
});