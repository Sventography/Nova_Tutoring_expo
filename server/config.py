import os
from dotenv import load_dotenv

# Load environment variables from server/.env
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

class Config:
    # Flask
    PORT = int(os.getenv("PORT", 5055))
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("DEBUG", "True").lower() in ("1", "true", "yes")

    # API / App URLs
    APP_FRONTEND_URL = os.getenv("APP_FRONTEND_URL", "http://localhost:5055")
    APP_CORS_ALLOWLIST = os.getenv("APP_CORS_ALLOWLIST", "http://localhost:5055")

    # Backend API base
    API_BASE = os.getenv("EXPO_PUBLIC_API_BASE", "http://127.0.0.1:5055")

    # OpenAI
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # Email / SMTP
    EMAIL_SERVICE = os.getenv("EMAIL_SERVICE", "Gmail")
    EMAIL_USER = os.getenv("EMAIL_USER")
    EMAIL_PASS = os.getenv("EMAIL_PASS")
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_SECURE = os.getenv("SMTP_SECURE", "false").lower() in ("1", "true", "yes")
    STORE_OWNER_EMAIL = os.getenv("STORE_OWNER_EMAIL")

    # Stripe
    STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY")
    STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY")
    STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

    # Google Knowledge Graph / Search
    GOOGLE_KG_API_KEY = os.getenv("GOOGLE_KG_API_KEY")
    GOOGLE_KG_SEARCH_URL = os.getenv("GOOGLE_KG_SEARCH_URL")
    GOOGLE_CSE_ID = os.getenv("GOOGLE_CSE_ID")
    GOOGLE_SEARCH_URL = os.getenv("GOOGLE_SEARCH_URL")
