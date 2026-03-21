from pymongo import MongoClient

client = MongoClient('mongodb+srv://scan2eatuser:Scan2eat123@scan2eat.getuaqt.mongodb.net/scan2eat?retryWrites=true&w=majority')
db = client['scan2eat']

# Remove test/dummy items
result = db.menu.delete_many({
    '$or': [
        {'name': 'bv h'},
        {'price': {'$lte': 2}},
        {'description': 'hvb'},
    ]
})
print(f'Removed {result.deleted_count} test items')
client.close()
print('Done!')