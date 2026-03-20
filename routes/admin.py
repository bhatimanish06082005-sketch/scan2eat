from flask import (
    Blueprint, render_template, request, redirect,
    url_for, session, flash, current_app
)
from extensions import mongo
from bson import ObjectId
from functools import wraps
import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            flash('Please login first.', 'error')
            return redirect(url_for('admin.login'))
        return f(*args, **kwargs)
    return decorated

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('admin_logged_in'):
        return redirect(url_for('admin.dashboard'))
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        cfg = current_app.config
        if username == cfg['ADMIN_USERNAME'] and password == cfg['ADMIN_PASSWORD']:
            session['admin_logged_in'] = True
            session['admin_username']  = username
            session.permanent = True
            return redirect(url_for('admin.dashboard'))
        else:
            flash('Invalid credentials. Please try again.', 'error')
    return render_template('admin/login.html')

@admin_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('admin.login'))

@admin_bp.route('/dashboard')
@login_required
def dashboard():
    total_orders = mongo.db.orders.count_documents({})
    pending      = mongo.db.orders.count_documents({'status': 'Pending'})
    preparing    = mongo.db.orders.count_documents({'status': 'Preparing'})
    completed    = mongo.db.orders.count_documents({'status': 'Completed'})
    rev          = list(mongo.db.orders.aggregate([
        {'$match': {'status': 'Completed'}},
        {'$group': {'_id': None, 'total': {'$sum': '$total'}}}
    ]))
    revenue    = rev[0]['total'] if rev else 0
    orders     = list(mongo.db.orders.find().sort('created_at', -1).limit(50))
    for o in orders:
        o['_id'] = str(o['_id'])
        if isinstance(o.get('created_at'), datetime.datetime):
            o['created_at'] = o['created_at'].strftime('%d %b, %I:%M %p')
    menu_items = list(mongo.db.menu.find().sort('category', 1))
    for m in menu_items:
        m['_id'] = str(m['_id'])
    stats = {
        'total':     total_orders,
        'pending':   pending,
        'preparing': preparing,
        'completed': completed,
        'revenue':   round(revenue, 2),
    }
    return render_template('admin/dashboard.html',
                           orders=orders,
                           menu_items=menu_items,
                           stats=stats)