from flask import Blueprint, request, jsonify, session
from extensions import mongo
from bson import ObjectId
import datetime
from functools import wraps
import razorpay
from flask import current_app

api_bp = Blueprint('api', __name__)

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ── PLACE ORDER ──
@api_bp.route('/order', methods=['POST'])
def place_order():
    try:
        data = request.get_json()
        if not data or not data.get('items'):
            return jsonify({'success': False, 'message': 'Cart is empty'}), 400

        items = data['items']
        name  = data.get('customer_name', 'Guest').strip() or 'Guest'
        order_type = data.get('order_type', 'dine-in')

        validated_items = []
        total = 0
        for item in items:
            qty      = max(1, int(item.get('qty', 1)))
            price    = float(item.get('price', 0))
            subtotal = price * qty
            total   += subtotal
            validated_items.append({
                'name':     item.get('name', ''),
                'price':    price,
                'emoji':    item.get('emoji', '🍽️'),
                'qty':      qty,
                'subtotal': subtotal,
            })

        if not validated_items:
            return jsonify({'success': False, 'message': 'No valid items'}), 400

        gst         = round(total * 0.05, 2)
        grand_total = round(total + gst, 2)

        order = {
            'customer_name': name,
            'items':         validated_items,
            'subtotal':      round(total, 2),
            'gst':           gst,
            'total':         grand_total,
            'order_type':    order_type,
            'status':        'Pending',
            'payment':       'Pending',
            'created_at':    datetime.datetime.utcnow(),
        }

        result   = mongo.db.orders.insert_one(order)
        order_id = str(result.inserted_id)

        return jsonify({
            'success':  True,
            'order_id': order_id,
            'total':    grand_total,
        })

    except Exception as e:
        print('Order error:', e)
        return jsonify({'success': False, 'message': str(e)}), 500

# ── RAZORPAY CREATE ──
@api_bp.route('/payment/create', methods=['POST'])
def create_payment():
    try:
        data     = request.get_json()
        order_id = data.get('order_id')
        amount   = data.get('amount')

        client   = razorpay.Client(
            auth=(current_app.config['RAZORPAY_KEY_ID'],
                  current_app.config['RAZORPAY_KEY_SECRET'])
        )
        rz_order = client.order.create({
            'amount':          int(float(amount) * 100),
            'currency':        'INR',
            'receipt':         order_id,
            'payment_capture': 1
        })

        return jsonify({
            'success':     True,
            'rz_order_id': rz_order['id'],
            'key_id':      current_app.config['RAZORPAY_KEY_ID'],
            'amount':      rz_order['amount'],
        })
    except Exception as e:
        print('Razorpay error:', e)
        return jsonify({'success': False, 'message': str(e)}), 500

# ── RAZORPAY VERIFY ──
@api_bp.route('/payment/verify', methods=['POST'])
def verify_payment():
    try:
        data   = request.get_json()
        client = razorpay.Client(
            auth=(current_app.config['RAZORPAY_KEY_ID'],
                  current_app.config['RAZORPAY_KEY_SECRET'])
        )
        client.utility.verify_payment_signature({
            'razorpay_order_id':   data['razorpay_order_id'],
            'razorpay_payment_id': data['razorpay_payment_id'],
            'razorpay_signature':  data['razorpay_signature'],
        })
        mongo.db.orders.update_one(
            {'_id': ObjectId(data['order_id'])},
            {'$set': {
                'payment':    'Paid',
                'payment_id': data['razorpay_payment_id'],
            }}
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

# ── ORDER STATUS ──
@api_bp.route('/api/order/status', methods=['POST'])
@admin_required
def update_status():
    try:
        data   = request.get_json()
        status = data.get('status')
        if status not in ['Pending', 'Preparing', 'Completed']:
            return jsonify({'success': False}), 400
        mongo.db.orders.update_one(
            {'_id': ObjectId(data['order_id'])},
            {'$set': {'status': status}}
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── DELETE ORDER ──
@api_bp.route('/api/order/delete', methods=['POST'])
@admin_required
def delete_order():
    try:
        data = request.get_json()
        mongo.db.orders.delete_one({'_id': ObjectId(data['order_id'])})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── CLEAR COMPLETED ──
@api_bp.route('/api/orders/clear-completed', methods=['POST'])
@admin_required
def clear_completed():
    try:
        mongo.db.orders.delete_many({'status': 'Completed'})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── STATS ──
@api_bp.route('/api/stats')
@admin_required
def get_stats():
    try:
        orders    = list(mongo.db.orders.find())
        pending   = sum(1 for o in orders if o['status'] == 'Pending')
        preparing = sum(1 for o in orders if o['status'] == 'Preparing')
        completed = sum(1 for o in orders if o['status'] == 'Completed')
        revenue   = sum(o.get('total', 0) for o in orders if o['status'] == 'Completed')
        return jsonify({
            'pending':   pending,
            'preparing': preparing,
            'completed': completed,
            'revenue':   round(revenue, 2),
            'total':     len(orders)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── MENU TOGGLE ──
@api_bp.route('/api/menu/toggle', methods=['POST'])
@admin_required
def toggle_item():
    try:
        data = request.get_json()
        mongo.db.menu.update_one(
            {'_id': ObjectId(data['item_id'])},
            {'$set': {'available': data['available']}}
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── ADD MENU ITEM ──
@api_bp.route('/api/menu/add', methods=['POST'])
@admin_required
def add_item():
    try:
        data = request.get_json()
        item = {
            'name':        data['name'],
            'emoji':       data.get('emoji', '🍽️'),
            'price':       float(data['price']),
            'category':    data['category'],
            'description': data.get('description', ''),
            'available':   data.get('available', True),
            'veg':         data.get('veg', True),
            'created_at':  datetime.datetime.utcnow(),
        }
        mongo.db.menu.insert_one(item)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── EDIT MENU ITEM ──
@api_bp.route('/api/menu/edit', methods=['POST'])
@admin_required
def edit_item():
    try:
        data = request.get_json()
        mongo.db.menu.update_one(
            {'_id': ObjectId(data['item_id'])},
            {'$set': {
                'name':        data['name'],
                'emoji':       data.get('emoji', '🍽️'),
                'price':       float(data['price']),
                'category':    data['category'],
                'description': data.get('description', ''),
                'available':   data.get('available', True),
            }}
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── DELETE MENU ITEM ──
@api_bp.route('/api/menu/delete', methods=['POST'])
@admin_required
def delete_item():
    try:
        data = request.get_json()
        mongo.db.menu.delete_one({'_id': ObjectId(data['item_id'])})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    # ── PAYMENT CONFIRM (COD / UPI) ──
@api_bp.route('/payment/confirm', methods=['POST'])
def confirm_payment():
    try:
        data   = request.get_json()
        method = data.get('method', 'cod')
        mongo.db.orders.update_one(
            {'_id': ObjectId(data['order_id'])},
            {'$set': {
                'payment': 'COD' if method == 'cod' else 'UPI',
                'payment_method': method
            }}
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── ORDER STATUS POLL ──
@api_bp.route('/order/status/<order_id>')
def order_status(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return jsonify({'status': 'Unknown'})
        return jsonify({'status': order.get('status', 'Pending')})
    except Exception as e:
        return jsonify({'status': 'Unknown'})