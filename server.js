const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ===== ДАННЫЕ В ПАМЯТИ =====
let users = [
    { email: 'user@example.com', name: 'Тестовый Пользователь', password: 'password123' }
];

let profiles = [];

// ============================================================
// 1. АВТОРИЗАЦИЯ
// ============================================================

// 📝 Регистрация
app.post('/users', (req, res) => {
    const { email, name, password } = req.body;
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'Пользователь уже существует' });
    }
    const newUser = { email, name, password };
    users.push(newUser);
    res.status(201).json({ email: newUser.email, name: newUser.name });
});

// 🔑 Вход
app.post('/users/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ user: { email: user.email, name: user.name }, session: 'saved' });
    } else {
        res.status(401).json({ error: 'Неверный логин или пароль' });
    }
});

// 🚪 Выход
app.post('/users/logout', (req, res) => {
    res.json({ message: 'Выход выполнен' });
});

// ============================================================
// 2. ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ
// ============================================================

// 👤 Получить профиль
app.get('/users/profile', (req, res) => {
    const email = req.headers['x-user-email'];
    const user = users.find(u => u.email === email);
    if (user) {
        res.json({ email: user.email, name: user.name });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// ✏️ Обновить профиль
app.put('/users/profile', (req, res) => {
    const email = req.headers['x-user-email'];
    const { name, email: newEmail, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
    }
    if (name) user.name = name;
    if (newEmail) {
        if (users.find(u => u.email === newEmail && u.email !== email)) {
            return res.status(409).json({ error: 'Email уже занят' });
        }
        profiles.forEach(p => {
            if (p.createdBy === email) p.createdBy = newEmail;
        });
        user.email = newEmail;
    }
    if (password) user.password = password;
    res.json({ email: user.email, name: user.name });
});

// ============================================================
// 3. ПРОФИЛИ (CRUD)
// ============================================================

// 📋 Получить все профили
app.get('/profiles', (req, res) => {
    const email = req.headers['x-user-email'];
    if (!email) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const userProfiles = profiles.filter(p => p.createdBy === email);
    res.json(userProfiles);
});

// ➕ Создать профиль
app.post('/profiles', (req, res) => {
    const email = req.headers['x-user-email'];
    if (!email) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const { name, email: profileEmail, phone, website } = req.body;
    if (!name || !profileEmail) {
        return res.status(400).json({ error: 'Имя и Email обязательны' });
    }
    const newProfile = {
        id: Date.now(),
        name,
        email: profileEmail,
        phone: phone || '—',
        website: website || '—',
        createdBy: email,
        createdAt: new Date().toISOString()
    };
    profiles.push(newProfile);
    res.status(201).json(newProfile);
});

// 🔍 Получить профиль по ID
app.get('/profiles/:id', (req, res) => {
    const email = req.headers['x-user-email'];
    if (!email) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const id = parseInt(req.params.id);
    const profile = profiles.find(p => p.id === id && p.createdBy === email);
    if (profile) {
        res.json(profile);
    } else {
        res.status(404).json({ error: 'Профиль не найден' });
    }
});

// ✏️ Обновить профиль по ID
app.put('/profiles/:id', (req, res) => {
    const email = req.headers['x-user-email'];
    if (!email) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const id = parseInt(req.params.id);
    const index = profiles.findIndex(p => p.id === id && p.createdBy === email);
    if (index === -1) {
        return res.status(404).json({ error: 'Профиль не найден' });
    }
    const { name, email: profileEmail, phone, website } = req.body;
    if (name) profiles[index].name = name;
    if (profileEmail) profiles[index].email = profileEmail;
    if (phone) profiles[index].phone = phone;
    if (website) profiles[index].website = website;
    res.json(profiles[index]);
});

// 🗑 Удалить профиль по ID
app.delete('/profiles/:id', (req, res) => {
    const email = req.headers['x-user-email'];
    if (!email) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const id = parseInt(req.params.id);
    const index = profiles.findIndex(p => p.id === id && p.createdBy === email);
    if (index === -1) {
        return res.status(404).json({ error: 'Профиль не найден' });
    }
    profiles.splice(index, 1);
    res.status(204).send();
});

// ============================================================
// 4. СТАТИСТИКА
// ============================================================

// 📊 Получить статистику
app.get('/dashboard', (req, res) => {
    const email = req.headers['x-user-email'];
    if (!email) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    const userProfiles = profiles.filter(p => p.createdBy === email);
    res.json({
        totalProfiles: userProfiles.length,
        totalUsers: users.length,
        lastProfiles: userProfiles.slice(0, 5)
    });
});

// ============================================================
// 5. ЗАПУСК
// ============================================================

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`🔑 Тестовый вход: user@example.com / password123`);
});