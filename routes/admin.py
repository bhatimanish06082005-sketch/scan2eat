from flask import (
    Blueprint, render_template, request, redirect,
    url_for, session, flash, current_app
)
from extensions import mongo
from bson import ObjectId
from functools import wraps
from werkzeug.security import check_password_hash
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
        admin = mongo.db.admins.find_one({'username': username})
        if admin and check_password_hash(admin['password'], password):
            session['admin_logged_in'] = True
            session['admin_username']  = username
            session.permanent = True
            return redirect(url_for('admin.dashboard'))
        # fallback to config credentials
        cfg = current_app.config
        if username == cfg.get('ADMIN_USERNAME') and password == cfg.get('ADMIN_PASSWORD'):
            session['admin_logged_in'] = True
            session['admin_username']  = username
            session.permanent = True
            return redirect(url_for('admin.dashboard'))
        flash('Invalid credentials. Please try again.', 'error')
    return render_template('admin/login.html')

@admin_bp.route('/logout')
def logout():
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin.login'))

@admin_bp.route('/dashboard')
@login_required
def dashboard():
    all_orders = list(mongo.db.orders.find().sort('created_at', -1).limit(100))

    qr_orders  = []
    cod_orders = []

    for o in all_orders:
        o['_id'] = str(o['_id'])
        if isinstance(o.get('created_at'), datetime.datetime):
            o['created_at'] = o['created_at'].strftime('%d %b, %I:%M %p')
        if o.get('payment_method') == 'qr':
            qr_orders.append(o)
        else:
            cod_orders.append(o)

    pending   = sum(1 for o in all_orders if o['status'] == 'Pending')
    preparing = sum(1 for o in all_orders if o['status'] == 'Preparing')
    completed = sum(1 for o in all_orders if o['status'] == 'Completed')
    revenue   = sum(o.get('total', 0) for o in all_orders if o['status'] == 'Completed')

    menu_items = list(mongo.db.menu.find().sort('category', 1))
    for m in menu_items:
        m['_id'] = str(m['_id'])

    stats = {
        'total':     len(all_orders),
        'pending':   pending,
        'preparing': preparing,
        'completed': completed,
        'revenue':   round(revenue, 2),
    }

    return render_template('admin/dashboard.html',
                           orders=all_orders,
                           qr_orders=qr_orders,
                           cod_orders=cod_orders,
                           menu_items=menu_items,
                           stats=stats)