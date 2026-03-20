from flask import Flask
from extensions import mongo
from config import Config
import datetime

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    mongo.init_app(app)

    with app.app_context():
        try:
            from werkzeug.security import generate_password_hash
            if mongo.db.admins.count_documents({}) == 0:
                mongo.db.admins.insert_one({
                    'username': 'admin',
                    'password': generate_password_hash('admin123')
                })
                print('Admin seeded')
        except Exception as e:
            print('Admin seed error:', e)

    from routes.user  import user_bp
    from routes.admin import admin_bp
    from routes.api   import api_bp

    app.register_blueprint(user_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')