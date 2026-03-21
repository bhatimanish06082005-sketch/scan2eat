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
    'Poha':                 'https://thumbs.dreamstime.com/b/poha-23333662.jpg',
    'Upma':                 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTB3naOl7xQF5GDKBslwpJW0OcxDDtlR-tVeQ&s',
    'Samosa (2 pcs)':       'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
    'Vada Pav':             'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&q=80',
    'Grilled Sandwich':     'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400&q=80',
    'Pav Bhaji':            'https://shwetainthekitchen.com/wp-content/uploads/2022/07/Pav-bhaji.jpg',
    'Mango Lassi':          'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&q=80',
    'Cold Coffee':          'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
    'Fresh Lime Soda':      'https://www.ndtv.com/cooks/images/lime-soda-620.jpg',
    'Masala Chai':          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80',
    'Choco Lava Cake':      'https://images.unsplash.com/photo-1617305855058-336d24456869?w=400&q=80',
    'Gulab Jamun':          'https://www.indianhealthyrecipes.com/wp-content/uploads/2021/11/gulab-jamun.webp',
    'Kulfi':                'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&q=80',
}

for name, url in photos.items():
    result = db.menu.update_one({'name': name}, {'$set': {'image_url': url}})
    print(f'Updated {name}: {result.modified_count}')

client.close()
print('Done!')