# 🍽️ QueueLess — Smart Canteen Ordering System

Full-stack web app: **Flask + MongoDB + jQuery**

## 📁 Structure
```
queueless/
├── app.py              ← Flask entry point
├── config.py           ← Configuration
├── extensions.py       ← PyMongo setup
├── seed.py             ← Run once to seed DB
├── requirements.txt
├── routes/
│   ├── user.py         ← Menu & confirmation pages
│   ├── admin.py        ← Admin login & dashboard
│   └── api.py          ← All AJAX endpoints
├── templates/
│   ├── base.html
│   ├── menu.html
│   ├── confirmation.html
│   └── admin/
│       ├── login.html
│       └── dashboard.html
└── static/
    ├── css/style.css
    └── js/
        ├── main.js     ← Toast notifications
        ├── cart.js     ← Cart & ordering
        └── admin.js    ← Dashboard actions
```

## ⚙️ Quick Setup

### 1. Install Python deps
```bash
cd queueless
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start MongoDB
**Mac:**   `brew services start mongodb-community`
**Linux:** `sudo systemctl start mongodb`
**Windows:** Run MongoDB Compass or `mongod` in terminal

### 3. Seed the database (run once)
```bash
python seed.py
```

### 4. Start the app
```bash
python app.py
```

### 5. Open browser
- Menu:  http://localhost:5000
- Admin: http://localhost:5000/admin/login

## 🔑 Admin Login
| Username | Password  |
|----------|-----------|
| admin    | admin123  |

## 🗄️ MongoDB Collections
- `menu` — food items
- `orders` — customer orders

## 🌐 Key API Endpoints
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/order | Place order |
| PATCH | /api/admin/orders/<id>/status | Update status |
| DELETE | /api/admin/orders/<id> | Delete order |
| POST | /api/admin/menu | Add item |
| PUT | /api/admin/menu/<id> | Edit item |
| DELETE | /api/admin/menu/<id> | Delete item |
