import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ==========================================
    # Base de datos (MongoDB Atlas - autorizado por el instructor
    # como alternativa NoSQL a una base de datos relacional)
    # ==========================================
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "JRTECHAPI")

    # ==========================================
    # JWT
    # ==========================================
    JWT_SECRET: str = os.getenv("JWT_SECRET", "cambia_esta_clave_en_produccion")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "480"))
    RESET_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30"))

    # ==========================================
    # CORS
    # ==========================================
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # ==========================================
    # Admin inicial (creado automáticamente por app/seed.py)
    # ==========================================
    ADMIN_NOMBRE: str = os.getenv("ADMIN_NOMBRE", "Administrador")
    ADMIN_APELLIDO: str = os.getenv("ADMIN_APELLIDO", "JR TECH")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "")

    # ==========================================
    # Envío de correo (recuperación de contraseña, facturas, PQR)
    # ==========================================
    # SMTP_* se dejan de usar para enviar (Railway bloquea los puertos SMTP
    # salientes 587/465), pero se conservan por compatibilidad si alguna vez
    # se corre el backend en un entorno que sí permita SMTP directo.
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_SECURE: bool = os.getenv("SMTP_SECURE", "false").lower() == "true"
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "JR TECH <no-reply@jrtech.com>")

    # Envío real de correo: API HTTPS de Brevo (antes Sendinblue). El correo
    # de "sender" en Brevo debe ser un remitente verificado en esa cuenta —
    # normalmente se usa el mismo correo con el que te registraste ahí.
    BREVO_API_KEY: str = os.getenv("BREVO_API_KEY", "")

    # ==========================================
    # Chatbot (Google Gemini)
    # ==========================================
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

    # ==========================================
    # Servidor
    # ==========================================
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()
