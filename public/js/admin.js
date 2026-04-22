// Проверка админа
async function checkAdmin() {
    const u = (await fetch('/api/user').then(r => r.json())).user;
    if (!u || u.role !== 'admin') window.location.href = '/login';
    return true;
}

// Названия категорий
function cat(c) {
    return { laptop: 'Ноутбуки', phone: 'Смартфоны', tv: 'Телевизоры', audio: 'Наушники', pc: 'ПК', tablet: 'Планшеты', watch: 'Часы', camera: 'Фотоаппараты' }[c] || c;
}

// Загрузка товаров
async function loadProducts() {
    const data = await fetch('/api/admin/products').then(r => r.json());
    document.getElementById('products-tbody').innerHTML = data.map(p => `<tr>
        <td>${p.id}</td><td><img src="${p.image}"></td><td>${p.name}</td><td>${p.price.toLocaleString()} ₽</td><td>${cat(p.category)}</td>
        <td><button onclick="editProduct(${p.id})">✏️</button> <button onclick="deleteProduct(${p.id})">🗑️</button></td>
    </tr>`).join('');
}

// Редактировать товар
async function editProduct(id) {
    const p = await fetch(`/api/products/${id}`).then(r => r.json());
    document.getElementById('product-id').value = p.id;
    document.getElementById('product-name').value = p.name;
    document.getElementById('product-price').value = p.price;
    document.getElementById('product-image').value = p.image;
    document.getElementById('product-category').value = p.category;
    document.getElementById('product-description').value = p.description;
    document.getElementById('product-modal').classList.add('active');
}

// Удалить товар
async function deleteProduct(id) {
    if (confirm('Удалить товар?')) await fetch(`/api/products/${id}`, { method: 'DELETE' }), loadProducts();
}

// Сохранить товар
document.getElementById('product-form').onsubmit = async e => {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const data = {
        name: document.getElementById('product-name').value,
        price: +document.getElementById('product-price').value,
        image: document.getElementById('product-image').value,
        category: document.getElementById('product-category').value,
        description: document.getElementById('product-description').value
    };
    await fetch(`/api/products${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    document.getElementById('product-modal').classList.remove('active');
    loadProducts();
};

// Переключение вкладок
document.querySelectorAll('.admin-tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.admin-tab').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById(t.dataset.tab + '-section').classList.add('active');
    if (t.dataset.tab === 'products') loadProducts();
});

// Автозагрузка
(async () => { if (await checkAdmin()) loadProducts(); })();