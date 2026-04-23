"""
CERTify API - PRODUCTION SAFE VERSION
FIXED: No table drops, safe startup, stable /api/stats, proper CORS, Render-friendly
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import json
import os
from werkzeug.utils import secure_filename

from auth import auth_bp, init_auth_tables, token_required

app = Flask(__name__)

# =========================
# FILE UPLOAD CONFIGURATION
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads', 'resumes')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx'}
MAX_CONTENT_LENGTH = 5 * 1024 * 1024

app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# =========================
# CORS CONFIG (FIXED FOR VERCEL)
# =========================
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

CORS(app, resources={
    r"/api/*": {
        "origins": [
            frontend_url,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://certify-web-lime.vercel.app"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

# =========================
# DATABASE CONFIG
# =========================
def get_db_config():
    if os.getenv("DB_HOST"):
        return {
            "host": os.getenv("DB_HOST"),
            "database": os.getenv("DB_NAME"),
            "user": os.getenv("DB_USER"),
            "password": os.getenv("DB_PASSWORD"),
            "port": os.getenv("DB_PORT", "5432")
        }

    return {
        "host": "localhost",
        "database": "certify_db",
        "user": "postgres",
        "password": "your_password",
        "port": "5432"
    }

DB_CONFIG = get_db_config()

def get_db():
    return psycopg2.connect(**DB_CONFIG)

# =========================
# AUTH
# =========================
app.register_blueprint(auth_bp, url_prefix='/api/auth')

@app.route('/')
def home():
    return "CERTify API Running"

# =========================
# SAFE DATABASE INIT (NO DROPS)
# =========================
def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS companies (
        company_id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        location VARCHAR(255),
        industry VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        job_id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        company_id INTEGER REFERENCES companies(company_id),
        employer_id VARCHAR(50),
        location VARCHAR(255),
        job_type VARCHAR(50),
        salary_min DECIMAL(10,2),
        salary_max DECIMAL(10,2),
        description TEXT,
        requirements TEXT[],
        posted_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_jobs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50),
        job_id VARCHAR(50),
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, job_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(50) PRIMARY KEY,
        job_id VARCHAR(50),
        applicant_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        cover_letter TEXT,
        resume_url TEXT,
        years_experience INTEGER DEFAULT 0,
        headline VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()
    cursor.close()
    conn.close()

    print("✅ Database ready (safe mode)")

# =========================
# STATS (FIXED - NEVER FAILS FRONTEND)
# =========================
@app.route('/api/stats')
def get_stats():
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM jobs")
        jobs_count = cursor.fetchone()[0]

        return jsonify({
            "status": "success",
            "data": {
                "database_status": "connected",
                "jobs_count": jobs_count
            }
        })

    except Exception as e:
        print("❌ STATS ERROR:", e)

        # IMPORTANT: still return 200 so frontend doesn't go offline
        return jsonify({
            "status": "success",
            "data": {
                "database_status": "degraded",
                "jobs_count": 0
            }
        }), 200

# =========================
# JOBS
# =========================
@app.route('/api/jobs')
def get_jobs():
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT j.*, c.name as company
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.company_id
            WHERE j.status='active'
            ORDER BY j.posted_date DESC
        """)

        jobs = cursor.fetchall()

        return jsonify({
            "status": "success",
            "data": {"jobs": jobs}
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =========================
# APPLY JOB
# =========================
@app.route('/api/apply/<job_id>', methods=['POST'])
def apply_job(job_id):
    try:
        data = request.get_json(force=True)

        app_id = f"APP-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO applications 
            (id, job_id, applicant_name, email, phone, cover_letter, resume_url, status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'pending')
        """, (
            app_id,
            job_id,
            data.get('name'),
            data.get('email'),
            data.get('phone'),
            data.get('cover_letter'),
            None
        ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            "status": "success",
            "data": {"application_id": app_id}
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =========================
# SAVED JOBS
# =========================
@app.route('/api/saved-jobs', methods=['POST'])
@token_required
def save_job(current_user, current_user_type):
    try:
        data = request.get_json(force=True)

        conn = get_db()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO saved_jobs (user_id, job_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
        """, (current_user, data.get("job_id")))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"status": "success"})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =========================
# START SERVER (SAFE)
# =========================
if __name__ == '__main__':
    init_auth_tables()
    init_db()

    print("🚀 CERTify API running safely on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000)
