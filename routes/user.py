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
    return datetime.datetime.now(IST).replace(tzinfo=None)

def get_ist_str():
    return datetime.datetime.now(IST).strftime('%d %b %Y, %I:%M %p')

def format_order_time(order):
    if order.get('created_at_str'):
        return order['created_at_str']
    elif isinstance(order.get('created_at'), datetime.datetime):
        return order['created_at'].strftime('%d %b %Y, %I:%M %p')
    return ''

# ── MENU ──
@user_bp.route('/')
def menu():
    kitchen      = mongo.db.settings.find_one({'key': 'kitchen'})
    kitchen_open = kitchen['value'] if kitchen else True
    items        = list(mongo.db.menu.find({'available': True}))
    for item in items:
        item['_id'] = str(item['_id'])
    categories = defaultdict(list)
    for item in items:
        categories[item['category']].append(item)
    announcement = mongo.db.settings.find_one({'key': 'announcement'})
    ann_text     = announcement.get('value', '') if announcement else ''
    return render_template('menu.html',
                           categories=categories,
                           kitchen_open=kitchen_open,
                           announcement=ann_text)

# ── UNIFIED AUTH PAGE ──
@user_bp.route('/auth')
def auth():
    return render_template('auth.html')

# ── REGISTER ──
@user_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name     = request.form.get('name', '').strip()
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        if not name or not email or not password:
            flash('All fields are required.', 'error')
            return redirect('/auth?tab=register')
        existing = mongo.db.users.find_one({'email': email})
        if existing:
            flash('Email already registered. Please login.', 'error')
            return redirect('/auth?tab=register')
        mongo.db.users.insert_one({
            'name':       name,
            'email':      email,
            'password':   generate_password_hash(password),
            'created_at': get_ist_time(),
        })
        flash('Account created! Please login.', 'success')
        return redirect('/auth?tab=login')
    return redirect('/auth?tab=register')

# ── LOGIN ──
@user_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email    = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        user     = mongo.db.users.find_one({'email': email})
        if user and check_password_hash(user['password'], password):
            session['user_id']   = str(user['_id'])
            session['user_name'] = user['name']
            session.permanent    = True
            return redirect('/')
        flash('Invalid email or password.', 'error')
        return redirect('/auth?tab=login')
    return redirect('/auth?tab=login')

# ── LOGOUT ──
@user_bp.route('/user/logout')
def user_logout():
    session.pop('user_id',   None)
    session.pop('user_name', None)
    return redirect('/')

# ── MY ORDERS ──
@user_bp.route('/my-orders')
def my_orders():
    if not session.get('user_id'):
        return redirect('/auth?tab=login')
    orders = list(mongo.db.orders.find(
        {'user_id': session['user_id']}
    ).sort('created_at', -1))
    for o in orders:
        o['_id']        = str(o['_id'])
        o['created_at'] = format_order_time(o)
    return render_template('my_orders.html', orders=orders)

# ── PAYMENT PAGE ──
@user_bp.route('/payment/<order_id>')
def payment(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return redirect('/')
        order['_id'] = str(order['_id'])
        return render_template('payment.html', order=order)
    except:
        return redirect('/')

# ── CONFIRMATION ──
@user_bp.route('/confirmation/<order_id>')
def confirmation(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return redirect('/')
        order['_id']        = str(order['_id'])
        order['created_at'] = format_order_time(order)
        return render_template('confirmation.html', order=order)
    except:
        return redirect('/')