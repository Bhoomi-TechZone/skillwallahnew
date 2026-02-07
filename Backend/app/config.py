# app/config.py

import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME: str = "Skillwallah Backend"
    VERSION: str = "1.0.0"

    # MongoDB Configuration with fallback
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb+srv://nkkashyap2001:bhoomi1234@cluster0.frywq.mongodb.net/lms?retryWrites=true&w=majority")
    # Fallback to local MongoDB if cloud connection fails
    MONGO_LOCAL_URI: str = os.getenv("MONGO_LOCAL_URI", "mongodb://localhost:27017/")
    DB_NAME: str = os.getenv("DB_NAME", "lms")

    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkey")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 525600))  # 365 days default
    REFRESH_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", 525600))  # 365 days

    # Upload Directory
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads"))

settings = Settings()
