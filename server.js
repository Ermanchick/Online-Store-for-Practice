// =====================================================
// TechStore - Интернет-магазин электроники
// =====================================================

// Подключение модулей
const express = require('express');
const Database = require('better-sqlite3');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

// Инициализация
const app = express();
const db = new Database('techstore.db');

// =====================================================
// База данных - Создание таблиц
// =====================================================
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        name TEXT,
        role TEXT DEFAULT 'user'
    );
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT,
        price REAL,
        image TEXT,
        category TEXT,
        description TEXT,
        featured INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        total REAL,
        status TEXT DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        price REAL
    );
`);

// Создание администратора
if (!db.prepare('SELECT id FROM users WHERE email = ?').get('admin@techstore.ru')) {
    db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
        'admin@techstore.ru',
        bcrypt.hashSync('admin123', 10),
        'Админ',
        'admin'
    );
}

// Товары по умолчанию
const products = [
    { name: 'ASUS VivoBook 15', price: 59990, image: '/images/1.jpg', category: 'laptop', description: '15.6" Full HD, Intel Core i5, 8GB RAM, 512GB SSD', featured: 1 },
    { name: 'iPhone 15 Pro', price: 129990, image: '/images/2.jpg', category: 'phone', description: '256GB, титановый корпус', featured: 1 },
    { name: 'Samsung TV 55"', price: 79990, image: '/images/3.jpg', category: 'tv', description: '55 дюймов, 4K UHD', featured: 1 },
    { name: 'Sony WH-1000XM5', price: 34990, image: '/images/4.jpg', category: 'audio', description: 'Беспроводные, шумоподавление', featured: 1 },
    { name: 'MSI Gaming PC', price: 149990, image: '/images/5.jpg', category: 'pc', description: 'RTX 4080, Intel i9', featured: 0 },
    { name: 'iPad Pro 12.9"', price: 99990, image: '/images/6.jpg', category: 'tablet', description: 'M2, 256GB', featured: 0 },
    { name: 'Apple Watch 9', price: 45990, image: '/images/7.jpg', category: 'watch', description: '45mm, GPS', featured: 0 },
    { name: 'Sony Alpha A7 IV', price: 189990, image: '/images/8.jpg', category: 'camera', description: '33MP, 4K 60fps', featured: 0 }
];

// Добавление товаров если их нет
if (db.prepare('SELECT COUNT(*) as c FROM products').get().c === 0) {
    const insert = db.prepare('INSERT INTO products (name, price, image, category, description, featured) VALUES (?, ?, ?, ?, ?, ?)');
    products.forEach(p => insert.run(p.name, p.price, p.image, p.category, p.description, p.featured));
}

// =====================================================
// Настройка Express
// =====================================================
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'techstore-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 }
}));

// =====================================================
// Маршруты страниц
// =====================================================
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/products', (_, res) => res.sendFile(path.join(__dirname, 'public', 'products.html')));
app.get('/cart', (_, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
app.get('/login', (_, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// Проверка админа
function admin(req, res, next) {
    req.session.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Нет доступа' });
}

// =====================================================
// API: Пользователи
// =====================================================
app.post('/api/register', (req, res) => {
    const { email, password, name } = req.body;
    try {
        db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(email, bcrypt.hashSync(password, 10), name);
        res.json({ success: true });
    } catch { res.json({ success: false, message: 'Пользователь уже существует' }); }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    user && bcrypt.compareSync(password, user.password)
        ? (req.session.user = user, res.json({ success: true, user: { name: user.name, role: user.role } }))
        : res.json({ success: false, message: 'Неверный email или пароль' });
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/user', (req, res) => res.json({ user: req.session.user || null }));

// =====================================================
// API: Товары
// =====================================================
app.get('/api/products', (_, res) => res.json(db.prepare('SELECT * FROM products').all()));
app.get('/api/products/featured', (_, res) => res.json(db.prepare('SELECT * FROM products WHERE featured = 1').all()));
app.get('/api/products/:id', (req, res) => res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)));

// admin: Добавить товар
app.post('/api/products', admin, (req, res) => {
    const { name, price, image, category, description, featured } = req.body;
    db.prepare('INSERT INTO products (name, price, image, category, description, featured) VALUES (?, ?, ?, ?, ?)').run(name, price, image, category, description, featured ? 1 : 0);
    res.json({ success: true });
});

// admin: Изменить товар
app.put('/api/products/:id', admin, (req, res) => {
    const { name, price, image, category, description, featured } = req.body;
    db.prepare('UPDATE products SET name = ?, price = ?, image = ?, category = ?, description = ?, featured = ? WHERE id = ?').run(name, price, image, category, description, featured ? 1 : 0, req.params.id);
    res.json({ success: true });
});

// admin: Удалить товар
app.delete('/api/products/:id', admin, (req, res) => { db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id); res.json({ success: true }); });

// =====================================================
// API: Заказы
// =====================================================
// admin: Список заказов
app.get('/api/orders', admin, (_, res) => res.json(db.prepare('SELECT o.*, u.name n, u.email e FROM orders o LEFT JOIN u ON o.user_id = u.id ORDER BY o.id DESC').all()));

// admin: Изменить статус заказа
app.put('/api/orders/:id/status', admin, (req, res) => { db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id); res.json({ success: true }); });

// Создать заказ
app.post('/api/orders', (req, res) => {
    const { cart, total } = req.body;
    if (!req.session.user) return res.json({ success: false, message: 'Требуется авторизация' });
    const info = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(req.session.user.id, total);
    cart.forEach(item => db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)').run(info.lastInsertRowid, item.id, item.quantity, item.price));
    res.json({ success: true, orderId: info.lastInsertRowid });
});

// =====================================================
// API: Админ-панель
// =====================================================
app.get('/api/admin/products', admin, (_, res) => res.json(db.prepare('SELECT * FROM products').all()));
app.get('/api/admin/users', admin, (_, res) => res.json(db.prepare('SELECT id, email, name, role FROM users').all()));

// =====================================================
// Запуск сервера
// =====================================================
app.listen(3001, () => console.log('http://localhost:3001'));