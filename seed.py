"""
QueueLess — Database Seeder
Run: python seed.py
Seeds initial admin credentials and sample menu items.
"""

from pymongo import MongoClient
import datetime

MONGO_URI = 'mongodb://localhost:27017/queueless'

client = MongoClient(MONGO_URI)
db = client['queueless']

# ── Clear existing data ──────────────────────────────────
print("🗑  Clearing existing data...")
db.menu.drop()

# ── Seed Menu ────────────────────────────────────────────
print("🍽  Seeding menu items...")

menu_items = [
    # Main Course
    {'name': 'Paneer Butter Masala',  'price': 89,  'category': 'Main Course', 'emoji': '🍛', 'description': 'Creamy tomato-based gravy with soft paneer cubes.',         'available': True},
    {'name': 'Chicken Biryani',        'price': 119, 'category': 'Main Course', 'emoji': '🍚', 'description': 'Fragrant basmati rice layered with spiced chicken.',        'available': True},
    {'name': 'Veg Fried Rice',         'price': 65,  'category': 'Main Course', 'emoji': '🥘', 'description': 'Wok-tossed vegetables and jasmine rice.',                   'available': True},
    {'name': 'Rajma Chawal',           'price': 75,  'category': 'Main Course', 'emoji': '🫘', 'description': 'Slow-cooked kidney beans with steamed rice.',               'available': True},
    {'name': 'Egg Curry',              'price': 65,  'category': 'Main Course', 'emoji': '🍳', 'description': 'Boiled eggs in tangy onion-tomato masala.',                 'available': True},

    # Breakfast
    {'name': 'Masala Dosa',            'price': 55,  'category': 'Breakfast',   'emoji': '🫔', 'description': 'Crispy rice crepe with spiced potato filling.',             'available': True},
    {'name': 'Idli Sambar',            'price': 45,  'category': 'Breakfast',   'emoji': '🥣', 'description': 'Steamed rice cakes with lentil soup and chutneys.',         'available': True},
    {'name': 'Poha',                   'price': 30,  'category': 'Breakfast',   'emoji': '🌾', 'description': 'Flattened rice with turmeric, peanuts and fresh herbs.',    'available': True},
    {'name': 'Upma',                   'price': 30,  'category': 'Breakfast',   'emoji': '🍲', 'description': 'Semolina cooked with vegetables and mustard seeds.',        'available': True},

    # Snacks
    {'name': 'Samosa (2 pcs)',         'price': 30,  'category': 'Snacks',      'emoji': '🥟', 'description': 'Golden fried pastry filled with spiced potatoes.',          'available': True},
    {'name': 'Vada Pav',               'price': 25,  'category': 'Snacks',      'emoji': '🍔', 'description': 'Mumbai street-style spiced potato slider.',                 'available': True},
    {'name': 'Grilled Sandwich',       'price': 50,  'category': 'Snacks',      'emoji': '🥪', 'description': 'Multi-layered veggie sandwich pressed to a crisp.',         'available': True},
    {'name': 'Pav Bhaji',              'price': 55,  'category': 'Snacks',      'emoji': '🫓', 'description': 'Spiced mashed veggie curry with buttered buns.',            'available': True},

    # Drinks
    {'name': 'Mango Lassi',            'price': 45,  'category': 'Drinks',      'emoji': '🥛', 'description': 'Chilled yogurt blended with sweet Alphonso mango.',        'available': True},
    {'name': 'Cold Coffee',            'price': 55,  'category': 'Drinks',      'emoji': '☕', 'description': 'Blended espresso with milk and ice cream.',                 'available': True},
    {'name': 'Fresh Lime Soda',        'price': 35,  'category': 'Drinks',      'emoji': '🥤', 'description': 'Sparkling water with fresh lime juice and mint.',           'available': True},
    {'name': 'Masala Chai',            'price': 20,  'category': 'Drinks',      'emoji': '🍵', 'description': 'Spiced Indian tea brewed with ginger and cardamom.',       'available': True},

    # Desserts
    {'name': 'Choco Lava Cake',        'price': 75,  'category': 'Desserts',    'emoji': '🍫', 'description': 'Warm chocolate cake with a molten ganache center.',         'available': True},
    {'name': 'Gulab Jamun',            'price': 35,  'category': 'Desserts',    'emoji': '🍮', 'description': 'Soft milk dumplings soaked in rose-cardamom syrup.',        'available': True},
    {'name': 'Kulfi',                  'price': 40,  'category': 'Desserts',    'emoji': '🍦', 'description': 'Traditional Indian ice cream in pistachio and mango.',     'available': True},
]

for item in menu_items:
    item['created_at'] = datetime.datetime.utcnow()

db.menu.insert_many(menu_items)
print(f"   ✅ Inserted {len(menu_items)} menu items")

print("\n🎉 Database seeded successfully!")
print("━" * 45)
print("📋 Default Admin Credentials:")
print("   Username : admin")
print("   Password : admin123")
print("━" * 45)
print("🚀 Run: python app.py")
print("   Then open: http://localhost:5000")
print("   Admin:     http://localhost:5000/admin/login")

client.close()
