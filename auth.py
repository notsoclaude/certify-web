"""
CERTify Authentication API - FIXED PRODUCTION SAFE
"""

from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
import bcrypt
import jwt
import datetime
from functools import wraps
import os

auth_bp = Blueprint('auth', __name__)

# =========================
# CONFIG (FIXED FOR RENDER)
# =========================
JWT_SECRET = os.getenv('JWT_SECRET', 'certify-secret-key')
JWT_EXPIRATION = 24  # hours


def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )

# =========================
# TOKEN CHECK (SAFE)
# =========================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):

        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        token = None
        auth_header = request.headers.get('Authorization')

        if auth_header:
            parts = auth_header.split()
            token = parts[-1]

        if not token:
            return jsonify({'status': 'error', 'message': 'Token missing'}), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user = data['user_id']
            current_role = data.get('role', 'user')

        except Exception:
            return jsonify({'status': 'error', 'message': 'Invalid token'}), 401

        return f(current_user, current_role, *args, **kwargs)

    return decorated

# =========================
# LOGIN (FIXED CRASH SAFE)
# =========================
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}

        email = data.get('email', '').lower().strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'status': 'error', 'message': 'Missing credentials'}), 400

        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user or not user.get('password_hash'):
            return jsonify({'status': 'error', 'message': 'Invalid credentials'}), 401

        try:
            valid = bcrypt.checkpw(
                password.encode(),
                user['password_hash'].encode()
            )
        except Exception:
            return jsonify({'status': 'error', 'message': 'Password verification failed'}), 401

        if not valid:
            return jsonify({'status': 'error', 'message': 'Invalid credentials'}), 401

        token = jwt.encode({
            'user_id': user['user_id'],
            'role': user['user_type'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION)
        }, JWT_SECRET, algorithm="HS256")

        return jsonify({
            'status': 'success',
            'data': {
                'token': token,
                'user': {
                    'user_id': user['user_id'],
                    'email': user['email'],
                    'first_name': user['first_name'],
                    'last_name': user['last_name'],
                    'user_type': user['user_type']
                }
            }
        })

    except Exception as e:
        print("LOGIN ERROR:", e)
        return jsonify({'status': 'error', 'message': 'Server error'}), 500

# =========================
# REGISTER (SAFE)
# =========================
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}

        email = data.get('email', '').lower().strip()
        password = data.get('password', '')
        first = data.get('first_name')
        last = data.get('last_name')
        user_type = data.get('user_type')

        if not all([email, password, first, last, user_type]):
            return jsonify({'status': 'error', 'message': 'Missing fields'}), 400

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            return jsonify({'status': 'error', 'message': 'Email exists'}), 409

        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        user_id = f"USR-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"

        cursor.execute("""
            INSERT INTO users (user_id, email, password_hash, first_name, last_name, user_type)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (user_id, email, hashed, first, last, user_type))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({'status': 'success'}), 201

    except Exception as e:
        print("REGISTER ERROR:", e)
        return jsonify({'status': 'error', 'message': 'Server error'}), 500

# =========================
# INIT TABLES
# =========================
def init_auth_tables():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id VARCHAR(50) PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            password_hash TEXT,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            user_type VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    conn.commit()
    cursor.close()
    conn.close()

    print("AUTH READY")
