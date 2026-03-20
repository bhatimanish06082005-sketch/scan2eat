from flask import Blueprint, render_template, redirect, url_for
from extensions import mongo
from bson import ObjectId
from collections import defaultdict

user_bp = Blueprint('user', __name__)

@user_bp.route('/')
def menu():
    items = list(mongo.db.menu.find({'available': True}))
    for item in items:
        item['_id'] = str(item['_id'])
    categories = defaultdict(list)
    for item in items:
        categories[item['category']].append(item)
    return render_template('menu.html', categories=categories)

@user_bp.route('/payment/<order_id>')
def payment(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return redirect(url_for('user.menu'))
        order['_id'] = str(order['_id'])
        return render_template('payment.html', order=order)
    except:
        return redirect(url_for('user.menu'))

@user_bp.route('/confirmation/<order_id>')
def confirmation(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return redirect(url_for('user.menu'))
        order['_id'] = str(order['_id'])
        return render_template('confirmation.html', order=order)
    except:
        return redirect(url_for('user.menu'))