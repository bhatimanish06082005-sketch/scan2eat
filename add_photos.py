from pymongo import MongoClient

client = MongoClient('mongodb+srv://scan2eatuser:Scan2eat123@scan2eat.getuaqt.mongodb.net/scan2eat?retryWrites=true&w=majority')
db = client['scan2eat']

photos = {
    'Paneer Butter Masala': 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&q=80',
    'Chicken Biryani':      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80',
    'Veg Fried Rice':       'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80',
    'Rajma Chawal':         'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
    'Egg Curry':            'https://images.unsplash.com/photo-1612201142855-7873bc1661b4?w=400&q=80',
    'Masala Dosa':          'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=400&q=80',
    'Idli Sambar':          'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=400&q=80',
    'Poha':                 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&q=80',
    'Upma':                 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=400&q=80',
    'Samosa (2 pcs)':       'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80',
    'Vada Pav':             'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&q=80',
    'Grilled Sandwich':     'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400&q=80',
    'Pav Bhaji':            'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&q=80',
    'Mango Lassi':          'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&q=80',
    'Cold Coffee':          'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&q=80',
    'Fresh Lime Soda':      'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
    'Masala Chai':          'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=400&q=80',
    'Choco Lava Cake':      'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&q=80',
    'Gulab Jamun':          'https://images.unsplash.com/photo-1601303516534-bf4b4e8f5c4b?w=400&q=80',
    'Kulfi':                'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&q=80',
}

for name, url in photos.items():
    result = db.menu.update_one({'name': name}, {'$set': {'image_url': url}})
    print(f'Updated {name}: {result.modified_count}')

client.close()
print('Done!')