from pymongo import MongoClient

client = MongoClient('mongodb+srv://scan2eatuser:Scan2eat123@scan2eat.getuaqt.mongodb.net/scan2eat?retryWrites=true&w=majority')
db = client['scan2eat']

photos = {
    'Paneer Butter Masala': 'https://placehold.co/400x300/2d1f0a/FF9900?text=Paneer+Butter+Masala',
    'Chicken Biryani':      'https://placehold.co/400x300/2d1f0a/FF9900?text=Chicken+Biryani',
    'Veg Fried Rice':       'https://placehold.co/400x300/2d1f0a/FF9900?text=Veg+Fried+Rice',
    'Rajma Chawal':         'https://placehold.co/400x300/2d1f0a/FF9900?text=Rajma+Chawal',
    'Egg Curry':            'https://placehold.co/400x300/2d1f0a/FF9900?text=Egg+Curry',
    'Masala Dosa':          'https://placehold.co/400x300/2d1f0a/FF9900?text=Masala+Dosa',
    'Idli Sambar':          'https://placehold.co/400x300/2d1f0a/FF9900?text=Idli+Sambar',
    'Poha':                 'https://placehold.co/400x300/2d1f0a/FF9900?text=Poha',
    'Upma':                 'https://placehold.co/400x300/2d1f0a/FF9900?text=Upma',
    'Samosa (2 pcs)':       'https://placehold.co/400x300/2d1f0a/FF9900?text=Samosa',
    'Vada Pav':             'https://placehold.co/400x300/2d1f0a/FF9900?text=Vada+Pav',
    'Grilled Sandwich':     'https://placehold.co/400x300/2d1f0a/FF9900?text=Grilled+Sandwich',
    'Pav Bhaji':            'https://placehold.co/400x300/2d1f0a/FF9900?text=Pav+Bhaji',
    'Mango Lassi':          'https://placehold.co/400x300/2d1f0a/FF9900?text=Mango+Lassi',
    'Cold Coffee':          'https://placehold.co/400x300/2d1f0a/FF9900?text=Cold+Coffee',
    'Fresh Lime Soda':      'https://placehold.co/400x300/2d1f0a/FF9900?text=Fresh+Lime+Soda',
    'Masala Chai':          'https://placehold.co/400x300/2d1f0a/FF9900?text=Masala+Chai',
    'Choco Lava Cake':      'https://placehold.co/400x300/2d1f0a/FF9900?text=Choco+Lava+Cake',
    'Gulab Jamun':          'https://placehold.co/400x300/2d1f0a/FF9900?text=Gulab+Jamun',
    'Kulfi':                'https://placehold.co/400x300/2d1f0a/FF9900?text=Kulfi',
}

for name, url in photos.items():
    result = db.menu.update_one({'name': name}, {'$set': {'image_url': url}})
    print(f'Updated {name}: {result.modified_count}')

client.close()
print('Done!')