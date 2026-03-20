from flask import Blueprint, render_template, redirect, url_for, request, session, flash
from extensions import mongo
from bson import ObjectId
from collections import defaultdict
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import pytz

user_bp = Blueprint('user', __name__)

IST = pytz.timezone('Asia/Kolkata')

def get_ist_time():
    return datetime.datetime.now(IST)

# ── Menu ──
@user_bp.route('/')
def menu():
    # Check kitchen status
    kitchen = mongo.db.settings.find_one({'key': 'kitchen'})
    kitchen_open = kitchen['value'] if kitchen else True

    items = list(mongo.db.menu.find({'available': True}))
    for item in items:
        item['_id'] = str(item['_id'])
    categories = defaultdict(list)
    for item in items:
        categories[item['category']].append(item)
    return render_template('menu.html',
                           categories=categories,
                           kitchen_open=kitchen_open)

# ── Unified Auth Page ──
@user_bp.route('/auth')
def auth():
    if session.get('user_id'):
        return redirect(url_for('user.my_orders'))
    return render_template('auth.html')

# ── Register ──
@user_bp.route('/register', methods=['GET', 'POST'])
def register():
    if session.get('user_id'):
        return redirect(url_for('user.my_orders'))
    if request.method == 'POST':
        name     = request.form.get('name', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        if not name or not email or not password:
            flash('All fields are required.', 'error')
            return redirect(url_for('user.auth') + '?tab=register')
        existing = mongo.db.users.find_one({'email': email})
        if existing:
            flash('Email already registered. Please login.', 'error')
            return redirect(url_for('user.auth') + '?tab=register')
        mongo.db.users.insert_one({
            'name':       name,
            'email':      email,
            'password':   generate_password_hash(password),
            'created_at': get_ist_time(),
        })
        flash('Account created! Please login.', 'success')
        return redirect(url_for('user.auth') + '?tab=login')
    return redirect(url_for('user.auth') + '?tab=register')

# ── Login ──
@user_bp.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('user_id'):
        return redirect(url_for('user.my_orders'))
    if request.method == 'POST':
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        user = mongo.db.users.find_one({'email': email})
        if user and check_password_hash(user['password'], password):
            session['user_id']   = str(user['_id'])
            session['user_name'] = user['name']
            session.permanent    = True
            return redirect(url_for('user.my_orders'))
        flash('Invalid email or password.', 'error')
        return redirect(url_for('user.auth') + '?tab=login')
    return redirect(url_for('user.auth') + '?tab=login')

# ── User Logout ──
@user_bp.route('/user/logout')
def user_logout():
    session.pop('user_id', None)
    session.pop('user_name', None)
    return redirect(url_for('user.menu'))

# ── My Orders ──
@user_bp.route('/my-orders')
def my_orders():
    if not session.get('user_id'):
        return redirect(url_for('user.auth') + '?tab=login')
    orders = list(mongo.db.orders.find(
        {'user_id': session['user_id']}
    ).sort('created_at', -1))
    for o in orders:
        o['_id'] = str(o['_id'])
        if isinstance(o.get('created_at'), datetime.datetime):
            try:
                if o['created_at'].tzinfo is None:
                    o['created_at'] = IST.localize(o['created_at'])
                o['created_at'] = o['created_at'].strftime('%d %b %Y, %I:%M %p')
            except:
                o['created_at'] = str(o.get('created_at_str', ''))
        elif o.get('created_at_str'):
            o['created_at'] = o['created_at_str']
    return render_template('my_orders.html', orders=orders)

# ── Payment Page ──
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

# ── Confirmation ──
@user_bp.route('/confirmation/<order_id>')
def confirmation(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return redirect(url_for('user.menu'))
        order['_id'] = str(order['_id'])
        # Format time
        if isinstance(order.get('created_at'), datetime.datetime):
            try:
                if order['created_at'].tzinfo is None:
                    order['created_at'] = IST.localize(order['created_at'])
                order['created_at'] = order['created_at'].strftime('%d %b %Y, %I:%M %p')
            except:
                order['created_at'] = order.get('created_at_str', '')
        elif order.get('created_at_str'):
            order['created_at'] = order['created_at_str']
        return render_template('confirmation.html', order=order)
    except:
        return redirect(url_for('user.menu'))