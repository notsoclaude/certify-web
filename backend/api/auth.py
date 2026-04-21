"""
CERTify Authentication API - CLEAN FIXED VERSION
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
# CONFIG
# =========================
JWT_SECRET = os.getenv('JWT_SECRET', 'certify-secret-key')
JWT_EXPIRATION = 24  # hours

DB_CONFIG = {
    "host": "localhost",
    "database": "certify_db",
    "user": "postgres",
    "password": "shanlhiemenez",
    "port": "5432"
}

def get_db():
    return psycopg2.connect(**DB_CONFIG)

# =========================
# TOKEN CHECK - FIXED
# =========================
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Allow browser preflight OPTIONS requests
        if request.method == 'OPTIONS':
            response = jsonify({'status': 'success'})
            response.status_code = 200
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
            return response

        token = None
        auth_header = request.headers.get('Authorization')

        # Better token extraction
        if auth_header:
            parts = auth_header.split()

            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
            elif len(parts) == 1:
                token = parts[0]

        if not token:
            return jsonify({
                'status': 'error',
                'message': 'Token missing'
            }), 401

        try:
            data = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            current_user = data['user_id']
            current_role = data.get('role', 'user')

        except jwt.ExpiredSignatureError:
            return jsonify({
                'status': 'error',
                'message': 'Token expired'
            }), 401

        except jwt.InvalidTokenError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid token'
            }), 401

        return f(current_user, current_role, *args, **kwargs)

    return decorated

# =========================
# REGISTER
# =========================
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        required = ['email', 'password', 'first_name', 'last_name', 'user_type']
        if not all(data.get(f) for f in required):
            return jsonify({'status': 'error', 'message': 'Missing fields'}), 400

        email = data['email'].lower().strip()
        password = data['password']
        user_type = data['user_type']

        if user_type not in ['jobseeker', 'employer']:
            return jsonify({'status': 'error', 'message': 'Invalid user type'}), 400

        if len(password) < 8:
            return jsonify({'status': 'error', 'message': 'Password too short'}), 400

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("SELECT user_id FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'status': 'error', 'message': 'Email already exists'}), 409

        hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

        user_id = f"USR-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}"

        cursor.execute("""
            INSERT INTO users (user_id, email, password_hash, first_name, last_name, user_type)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            email,
            hashed_pw,
            data['first_name'],
            data['last_name'],
            user_type
        ))

        conn.commit()
        cursor.close()
        conn.close()

        token = jwt.encode({
            'user_id': user_id,
            'role': user_type,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION)
        }, JWT_SECRET, algorithm="HS256")

        return jsonify({
            'status': 'success',
            'data': {
                'token': token,
                'user': {
                    'user_id': user_id,
                    'email': email,
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'user_type': user_type
                }
            }
        }), 201

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# =========================
# LOGIN
# =========================
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        email = data.get('email', '').lower().strip()
        password = data.get('password', '')

        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({'status': 'error', 'message': 'Invalid credentials'}), 401

        if not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
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
        return jsonify({'status': 'error', 'message': str(e)}), 500

# =========================
# ME (FIXED - NO HANG, SAFE OUTPUT)
# =========================
@auth_bp.route('/me', methods=['GET', 'OPTIONS'])
@token_required
def me(current_user, current_role):
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT user_id, email, first_name, last_name, user_type
            FROM users
            WHERE user_id=%s
        """, (current_user,))

        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404

        return jsonify({
            'status': 'success',
            'data': {
                'user': user
            }
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

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

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS jobseeker_profiles (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(50),
            phone VARCHAR(20)
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS employer_profiles (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(50),
            company_name VARCHAR(255),
            position VARCHAR(100)
        );
    """)

    conn.commit()
    cursor.close()
    conn.close()

    print("✅ AUTH TABLES READY")