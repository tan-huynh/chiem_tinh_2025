from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/')
    CORS(app)  # Enable CORS for all routes

    # Register blueprints
    from .routes.astrology import astrology_bp
    app.register_blueprint(astrology_bp, url_prefix='/api/astrology')

    # Serve index.html at root
    @app.route('/')
    def index():
        return app.send_static_file('index.html')

    return app
