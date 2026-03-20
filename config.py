import os

class Config:
    SECRET_KEY     = os.environ.get('SECRET_KEY', 'scan2eat-secret-2024')
    MONGO_URI      = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/queueless')
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')

    RAZORPAY_KEY_ID     = os.environ.get('RAZORPAY_KEY_ID', 'rzp_test_ST5omiMdwAtWA2')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '3Bw3ZoRmCv7BTITO3QwuwnMg')