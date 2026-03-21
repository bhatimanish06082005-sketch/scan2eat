from pymongo import MongoClient

client = MongoClient('mongodb+srv://scan2eatuser:Scan2eat123@scan2eat.getuaqt.mongodb.net/scan2eat?retryWrites=true&w=majority')
db = client['scan2eat']

photos = {
    'Paneer Butter Masala': 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&q=80',
    'Chicken Biryani':      'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=400&q=80',
    'Veg Fried Rice':       'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&q=80',
    'Rajma Chawal':         'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
    'Egg Curry':            'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&q=80',
    'Masala Dosa':          'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&q=80',
    'Idli Sambar':          'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80',
    'Poha':                 'https://images.unsplash.com/photo-1614777735417-4a50e37a38e8?w=400&q=80',
    'Upma':                 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&q=80',
    'Samosa (2 pcs)':       'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
    'Vada Pav':             'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&q=80',
    'Grilled Sandwich':     'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400&q=80',
    'Pav Bhaji':            'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'Mango Lassi':          'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80',
    'Cold Coffee':          'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
    'Fresh Lime Soda':      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80',
    'Masala Chai':          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
    'Choco Lava Cake':      'https://images.unsplash.com/photo-1617305855058-336d24456869?w=400&q=80',
    'Gulab Jamun':          'https://images.unsplash.com/photo-1666114696769-6e2af2852c49?w=400&q=80',
    'Kulfi':                'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
}

for name, url in photos.items():
    result = db.menu.update_one({'name': name}, {'$set': {'image_url': url}})
    print(f'Updated {name}: {result.modified_count}')

client.close()
print('Done!')