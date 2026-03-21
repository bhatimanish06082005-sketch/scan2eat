from flask import Blueprint, request, jsonify, session, current_app
from extensions import mongo
from bson import ObjectId
import datetime
import pytz
from functools import wraps
import razorpay
import requests
import json
import os, json
import google.auth.transport.requests
from google.oauth2 import service_account

api_bp = Blueprint('api', __name__)

IST = pytz.timezone('Asia/Kolkata')

def get_ist_time():
    return datetime.datetime.now(IST)

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

# ── FCM: SAVE TOKEN ──
@api_bp.route('/api/fcm/save-token', methods=['POST'])
def save_fcm_token():
    try:
        data  = request.get_json()
        token = data.get('token')
        if not token:
            return jsonify({'success': False}), 400

        user_id = session.get('user_id')

        # Save or update token
        mongo.db.fcm_tokens.update_one(
            {'token': token},
            {'$set': {
                'token':      token,
                'user_id':    user_id,
                'updated_at': get_ist_time(),
            }},
            upsert=True
        )
        return jsonify({'success': True})
    except Exception as e:
        print('FCM token save error:', e)
        return jsonify({'success': False}), 500

# ── FCM: SEND NOTIFICATION ──
def send_fcm_notification(user_id, title, body, data=None):
    try:
        # Get all tokens for this user
        query = {'user_id': user_id} if user_id else {}
        tokens = list(mongo.db.fcm_tokens.find(query))

        if not tokens:
            print('No FCM tokens found for user:', user_id)
            return False

        # Get access token using service account
        SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']
        try:
        
          sa_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '')
          if not sa_json:
            # fallback to file for local dev
            creds = service_account.Credentials.from_service_account_file(
                'firebase-service-account.json', scopes=SCOPES)
          else:
            sa_info = json.loads(sa_json)
            creds = service_account.Credentials.from_service_account_info(
                sa_info, scopes=SCOPES)
            creds.refresh(google.auth.transport.requests.Request())
            access_token = creds.token
        except Exception as e:
            print('Service account error:', e)
            # Fallback: use legacy server key if available
            return send_fcm_legacy(tokens, title, body, data)

        project_id = 'scan2eat-9883e'
        url = f'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send'

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type':  'application/json',
        }

        success_count = 0
        for token_doc in tokens:
            token = token_doc['token']
            payload = {
                'message': {
                    'token': token,
                    'notification': {
                        'title': title,
                        'body':  body,
                    },
                    'data': data or {},
                    'webpush': {
                        'notification': {
                            'title':   title,
                            'body':    body,
                            'icon':    '/static/img/icon.png',
                            'vibrate': [200, 100, 200],
                            'tag':     'order-update',
                            'renotify': True,
                        },
                        'fcm_options': {
                            'link': data.get('order_url', '/my-orders') if data else '/my-orders'
                        }
                    }
                }
            }
            resp = requests.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                success_count += 1
            else:
                print(f'FCM send error for token {token[:20]}...:', resp.text)

        return success_count > 0

    except Exception as e:
        print('FCM notification error:', e)
        return False

def send_fcm_legacy(tokens, title, body, data=None):
    """Fallback using legacy FCM HTTP API"""
    try:
        server_key = current_app.config.get('FCM_SERVER_KEY', '')
        if not server_key:
            return False

        url = 'https://fcm.googleapis.com/fcm/send'
        headers = {
            'Authorization': f'key={server_key}',
            'Content-Type':  'application/json',
        }

        for token_doc in tokens:
            payload = {
                'to': token_doc['token'],
                'notification': {
                    'title': title,
                    'body':  body,
                    'icon':  '/static/img/icon.png',
                },
                'data': data or {}
            }
            requests.post(url, headers=headers, json=payload)
        return True
    except Exception as e:
        print('FCM legacy error:', e)
        return False

# ── KITCHEN STATUS ──
@api_bp.route('/api/kitchen/status')
def kitchen_status():
    try:
        status  = mongo.db.settings.find_one({'key': 'kitchen'})
        is_open = status['value'] if status else True
        return jsonify({'open': is_open})
    except:
        return jsonify({'open': True})

@api_bp.route('/api/kitchen/toggle', methods=['POST'])
@admin_required
def kitchen_toggle():
    try:
        data    = request.get_json()
        is_open = data.get('open', True)
        mongo.db.settings.update_one(
            {'key': 'kitchen'},
            {'$set': {'key': 'kitchen', 'value': is_open}},
            upsert=True
        )
        return jsonify({'success': True, 'open': is_open})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── PLACE ORDER ──
@api_bp.route('/order', methods=['POST'])
def place_order():
    try:
        # Check kitchen
        kitchen = mongo.db.settings.find_one({'key': 'kitchen'})
        if kitchen and kitchen.get('value') == False:
            return jsonify({
                'success': False,
                'message': 'Kitchen is currently closed. Please try later.'
            }), 403

        data       = request.get_json()
        items      = data.get('items', [])
        name       = data.get('customer_name', '').strip()
        order_type = data.get('order_type', 'dine-in')
        user_id    = session.get('user_id', None)
        special    = data.get('special_instructions', '')

        if not name:
            return jsonify({'success': False, 'message': 'Please enter your name'}), 400

        validated_items = []
        total = 0
        for item in items:
            qty      = max(1, int(item.get('qty', 1)))
            price    = float(item.get('price', 0))
            subtotal = price * qty
            total   += subtotal
            validated_items.append({
                'name':         item.get('name', ''),
                'price':        price,
                'emoji':        item.get('emoji', ''),
                'image':        item.get('image', ''),
                'qty':          qty,
                'subtotal':     subtotal,
                'note':         item.get('note', ''),
            })

        if not validated_items:
            return jsonify({'success': False, 'message': 'No valid items'}), 400

        gst         = round(total * 0.05, 2)
        grand_total = round(total + gst, 2)
        now_ist     = get_ist_time()

        # Estimated wait time (5 mins per item, max 30)
        est_mins = min(len(validated_items) * 5, 30)

        order = {
            'customer_name':        name,
            'user_id':              user_id,
            'items':                validated_items,
            'subtotal':             round(total, 2),
            'gst':                  gst,
            'total':                grand_total,
            'order_type':           order_type,
            'status':               'Pending',
            'payment':              'Pending',
            'payment_method':       None,
            'special_instructions': special,
            'estimated_mins':       est_mins,
            'created_at':           now_ist,
            'created_at_str':       now_ist.strftime('%d %b %Y, %I:%M %p'),
        }

        result   = mongo.db.orders.insert_one(order)
        order_id = str(result.inserted_id)

        return jsonify({
            'success':       True,
            'order_id':      order_id,
            'total':         grand_total,
            'estimated_mins': est_mins,
        })

    except Exception as e:
        print('Order error:', e)
        return jsonify({'success': False, 'message': str(e)}), 500

# ── CREATE QR ──
@api_bp.route('/payment/create-qr', methods=['POST'])
def create_qr():
    try:
        data     = request.get_json()
        order_id = data.get('order_id')
        amount   = data.get('amount')

        client = razorpay.Client(
            auth=(current_app.config['RAZORPAY_KEY_ID'],
                  current_app.config['RAZORPAY_KEY_SECRET'])
        )

        payment_link = client.payment_link.create({
            'amount':          int(float(amount) * 100),
            'currency':        'INR',
            'description':     'Order #' + order_id[-6:].upper(),
            'reference_id':    order_id,
            'notify':          {'sms': False, 'email': False},
            'reminder_enable': False,
        })

        link_id  = payment_link['id']
        link_url = payment_link['short_url']

        mongo.db.orders.update_one(
            {'_id': ObjectId(order_id)},
            {'$set': {
                'payment_link_id': link_id,
                'payment_method':  'qr',
            }}
        )

        qr_image = f'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={link_url}'

        return jsonify({
            'success':         True,
            'payment_link_id': link_id,
            'payment_url':     link_url,
            'qr_image':        qr_image,
        })

    except Exception as e:
        print('QR error:', e)
        return jsonify({'success': False, 'message': str(e)}), 500

# ── CHECK PAYMENT ──
@api_bp.route('/payment/check/<order_id>')
def check_payment(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return jsonify({'paid': False})

        if order.get('payment') == 'Paid':
            return jsonify({'paid': True})

        link_id = order.get('payment_link_id')
        if not link_id:
            return jsonify({'paid': False})

        client = razorpay.Client(
            auth=(current_app.config['RAZORPAY_KEY_ID'],
                  current_app.config['RAZORPAY_KEY_SECRET'])
        )

        link = client.payment_link.fetch(link_id)

        if link.get('status') == 'paid':
            mongo.db.orders.update_one(
                {'_id': ObjectId(order_id)},
                {'$set': {
                    'payment': 'Paid',
                    'status':  'Preparing',
                }}
            )
            # Send notification
            user_id = order.get('user_id')
            if user_id:
                send_fcm_notification(
                    user_id,
                    'Payment Confirmed!',
                    f'Order #{order_id[-6:].upper()} confirmed. Being prepared now.',
                    {'order_url': f'/confirmation/{order_id}'}
                )
            return jsonify({'paid': True})

        return jsonify({'paid': False})

    except Exception as e:
        print('Check payment error:', e)
        return jsonify({'paid': False})

# ── CONFIRM COD ──
@api_bp.route('/payment/confirm', methods=['POST'])
def confirm_payment():
    try:
        data = request.get_json()
        mongo.db.orders.update_one(
            {'_id': ObjectId(data['order_id'])},
            {'$set': {
                'payment':        'COD',
                'payment_method': 'cod',
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
        return jsonify({
            'status':         order.get('status', 'Pending'),
            'payment':        order.get('payment', 'Pending'),
            'estimated_mins': order.get('estimated_mins', 10),
        })
    except:
        return jsonify({'status': 'Unknown'})

# ── ADMIN: UPDATE STATUS ──
@api_bp.route('/api/order/status', methods=['POST'])
@admin_required
def update_status():
    try:
        data   = request.get_json()
        status = data.get('status')
        if status not in ['Pending', 'Preparing', 'Ready', 'Completed']:
            return jsonify({'success': False}), 400

        order = mongo.db.orders.find_one({'_id': ObjectId(data['order_id'])})
        mongo.db.orders.update_one(
            {'_id': ObjectId(data['order_id'])},
            {'$set': {'status': status}}
        )

        # Send FCM notification when status changes
        if order:
            user_id  = order.get('user_id')
            order_id = str(order['_id'])
            if user_id and status == 'Preparing':
                send_fcm_notification(
                    user_id,
                    'Order Being Prepared',
                    f'Order #{order_id[-6:].upper()} is being prepared by the kitchen!',
                    {'order_url': f'/confirmation/{order_id}'}
                )
            elif user_id and status == 'Completed':
                method = order.get('payment_method', 'cod')
                if method == 'cod':
                    send_fcm_notification(
                        user_id,
                        'Order Ready! Come collect it',
                        f'Order #{order_id[-6:].upper()} is ready. Please pay cash at the counter.',
                        {'order_url': f'/confirmation/{order_id}'}
                    )
                else:
                    send_fcm_notification(
                        user_id,
                        'Order Ready for Pickup!',
                        f'Order #{order_id[-6:].upper()} is ready. Please collect from Counter 3.',
                        {'order_url': f'/confirmation/{order_id}'}
                    )

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── ADMIN: DELETE ORDER ──
@api_bp.route('/api/order/delete', methods=['POST'])
@admin_required
def delete_order():
    try:
        data = request.get_json()
        mongo.db.orders.delete_one({'_id': ObjectId(data['order_id'])})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── ADMIN: CLEAR COMPLETED ──
@api_bp.route('/api/orders/clear-completed', methods=['POST'])
@admin_required
def clear_completed():
    try:
        mongo.db.orders.delete_many({'status': 'Completed'})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── ADMIN: DELETE ALL ──
@api_bp.route('/api/orders/delete-all', methods=['POST'])
@admin_required
def delete_all_orders():
    try:
        mongo.db.orders.delete_many({})
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
            'emoji':       data.get('emoji', ''),
            'price':       float(data['price']),
            'category':    data['category'],
            'description': data.get('description', ''),
            'available':   data.get('available', True),
            'veg':         data.get('veg', True),
            'image_url':   data.get('image_url', ''),
            'created_at':  get_ist_time(),
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
                'emoji':       data.get('emoji', ''),
                'price':       float(data['price']),
                'category':    data['category'],
                'description': data.get('description', ''),
                'available':   data.get('available', True),
                'image_url':   data.get('image_url', ''),
            }}
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    # ── GET ORDER RECEIPT (ADMIN) ──
@api_bp.route('/api/order/receipt/<order_id>')
@admin_required
def get_order_receipt(order_id):
    try:
        order = mongo.db.orders.find_one({'_id': ObjectId(order_id)})
        if not order:
            return jsonify({'success': False, 'message': 'Order not found'}), 404
        order['_id'] = str(order['_id'])
        if isinstance(order.get('created_at'), datetime.datetime):
            try:
                if order['created_at'].tzinfo is None:
                    order['created_at'] = IST.localize(order['created_at'])
                order['created_at'] = order['created_at'].strftime('%d %b %Y, %I:%M %p')
            except:
                order['created_at'] = order.get('created_at_str', '')
        elif order.get('created_at_str'):
            order['created_at'] = order['created_at_str']
        return jsonify({'success': True, 'order': order})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# ── GET LATEST ORDERS (POLLING) ──
@api_bp.route('/api/orders/latest')
@admin_required
def get_latest_orders():
    try:
        orders = list(mongo.db.orders.find().sort('created_at', -1).limit(20))
        for o in orders:
            o['_id'] = str(o['_id'])
            if isinstance(o.get('created_at'), datetime.datetime):
                try:
                    if o['created_at'].tzinfo is None:
                        o['created_at'] = IST.localize(o['created_at'])
                    o['created_at_str'] = o['created_at'].strftime('%d %b %Y, %I:%M %p')
                    o['created_at'] = o['created_at_str']
                except:
                    o['created_at'] = o.get('created_at_str', '')
        return jsonify({'success': True, 'orders': orders})
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