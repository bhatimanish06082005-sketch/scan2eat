from flask import Blueprint, render_template, redirect, url_for, request, session, flash
from extensions import mongo
from bson import ObjectId
from collections import defaultdict
from werkzeug.security import generate_password_hash, check_password_hash
import datetime

user_bp = Blueprint('user', __name__)

# ── Menu ──
@user_bp.route('/')
def menu():
    items = list(mongo.db.menu.find({'available': True}))
    for item in items:
        item['_id'] = str(item['_id'])
    categories = defaultdict(list)
    for item in items:
        categories[item['category']].append(item)
    return render_template('menu.html', categories=categories)

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
            return render_template('register.html')
        existing = mongo.db.users.find_one({'email': email})
        if existing:
            flash('Email already registered. Please login.', 'error')
            return render_template('register.html')
        mongo.db.users.insert_one({
            'name':       name,
            'email':      email,
            'password':   generate_password_hash(password),
            'created_at': datetime.datetime.utcnow(),
        })
        flash('Account created! Please login.', 'success')
        return redirect(url_for('user.login'))
    return render_template('register.html')

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
            next_page = request.args.get('next', url_for('user.my_orders'))
            return redirect(next_page)
        flash('Invalid email or password.', 'error')
    return render_template('user_login.html')

# ── Logout ──
@user_bp.route('/user/logout')
def user_logout():
    session.pop('user_id', None)
    session.pop('user_name', None)
    return redirect(url_for('user.menu'))

# ── My Orders ──
@user_bp.route('/my-orders')
def my_orders():
    if not session.get('user_id'):
        return redirect(url_for('user.login') + '?next=/my-orders')
    orders = list(mongo.db.orders.find(
        {'user_id': session['user_id']}
    ).sort('created_at', -1))
    for o in orders:
        o['_id'] = str(o['_id'])
        if isinstance(o.get('created_at'), datetime.datetime):
            o['created_at'] = o['created_at'].strftime('%d %b %Y, %I:%M %p')
    return render_template('my_orders.html', orders=orders)

# ── Payment page ──
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
        return render_template('confirmation.html', order=order)
    except:
        return redirect(url_for('user.menu'))