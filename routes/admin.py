from flask import (
    Blueprint, render_template, request, redirect,
    url_for, session, flash
)
from extensions import mongo
from bson import ObjectId
from functools import wraps
from werkzeug.security import check_password_hash
import datetime
import pytz

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

IST = pytz.timezone('Asia/Kolkata')

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            flash('Please login first.', 'error')
            return redirect('/auth?tab=owner')
        return f(*args, **kwargs)
    return decorated

@admin_bp.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('admin_logged_in'):
        return redirect(url_for('admin.dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        # Clear ALL existing session first
        session.clear()

        # Check MongoDB admins collection
        try:
            admin = mongo.db.admins.find_one({'username': username})
            if admin and check_password_hash(admin['password'], password):
                session['admin_logged_in'] = True
                session['admin_username']  = username
                session.permanent          = True
                return redirect(url_for('admin.dashboard'))
        except Exception as e:
            print('Admin DB error:', e)

        # Fallback hardcoded credentials
        if username == 'admin' and password == 'admin123':
            session['admin_logged_in'] = True
            session['admin_username']  = username
            session.permanent          = True
            return redirect(url_for('admin.dashboard'))

        flash('Invalid credentials.', 'error')
        return redirect('/auth?tab=owner')

    return redirect('/auth?tab=owner')

@admin_bp.route('/logout')
def logout():
    session.clear()
    return redirect('/auth?tab=owner')

@admin_bp.route('/dashboard')
@login_required
def dashboard():
    try:
        all_orders = list(mongo.db.orders.find().sort('created_at', -1).limit(100))

        qr_orders  = []
        cod_orders = []

        for o in all_orders:
            o['_id'] = str(o['_id'])
            if o.get('created_at_str'):
                o['created_at'] = o['created_at_str']
            elif isinstance(o.get('created_at'), datetime.datetime):
                try:
                    if o['created_at'].tzinfo is None:
                        o['created_at'] = IST.localize(o['created_at'])
                    o['created_at'] = o['created_at'].strftime('%d %b %Y, %I:%M %p')
                except:
                    o['created_at'] = ''

            if o.get('payment_method') == 'qr':
                qr_orders.append(o)
            else:
                cod_orders.append(o)

        pending   = sum(1 for o in all_orders if o['status'] == 'Pending')
        preparing = sum(1 for o in all_orders if o['status'] == 'Preparing')
        ready     = sum(1 for o in all_orders if o['status'] == 'Ready')
        completed = sum(1 for o in all_orders if o['status'] == 'Completed')
        revenue   = sum(o.get('total', 0) for o in all_orders if o['status'] == 'Completed')

        menu_items = list(mongo.db.menu.find().sort('category', 1))
        for m in menu_items:
            m['_id'] = str(m['_id'])

        kitchen      = mongo.db.settings.find_one({'key': 'kitchen'})
        kitchen_open = kitchen['value'] if kitchen else True

        stats = {
            'total':     len(all_orders),
            'pending':   pending,
            'preparing': preparing,
            'ready':     ready,
            'completed': completed,
            'revenue':   round(revenue, 2),
        }

        return render_template('admin/dashboard.html',
                               orders=all_orders,
                               qr_orders=qr_orders,
                               cod_orders=cod_orders,
                               menu_items=menu_items,
                               stats=stats,
                               kitchen_open=kitchen_open)
    except Exception as e:
        print('Dashboard error:', e)
        return f'<h2>Dashboard Error: {e}</h2><a href="/admin/logout">Logout</a>'

# ── RECEIPT VIEW ──
@admin_bp.route('/receipt/<order_id>')
@login_required
def view_receipt(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return redirect(url_for('admin.dashboard'))
        order['_id'] = str(order['_id'])
        if o.get('created_at_str'):
            order['created_at'] = order['created_at_str']
        elif isinstance(order.get('created_at'), datetime.datetime):
            try:
                if order['created_at'].tzinfo is None:
                    order['created_at'] = IST.localize(order['created_at'])
                order['created_at'] = order['created_at'].strftime('%d %b %Y, %I:%M %p')
            except:
                order['created_at'] = ''
        return render_template('admin/receipt.html', order=order)
    except Exception as e:
        return f'<h2>Error: {e}</h2><a href="/admin/dashboard">Back</a>'