"""
CERTify API - COMPLETE WORKING VERSION
Jobs + Auth + Saved Jobs + Applicants + System Stats + Resume Upload + Dashboard
FIXED: Proper user email lookup for applications
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
print(f"📁 Upload folder: {UPLOAD_FOLDER}")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# =========================
# CORS CONFIGURATION
# =========================
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    },
    r"/uploads/*": {
        "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
        "methods": ["GET", "OPTIONS"],
        "supports_credentials": True
    }
})

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({"status": "ok"})
        response.headers.add("Access-Control-Allow-Origin", request.headers.get("Origin", "*"))
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response, 200

@app.before_request
def force_json_content_type():
    if request.path.startswith('/api/') and request.method in ['POST', 'PUT']:
        if not request.content_type and request.data:
            request.environ['CONTENT_TYPE'] = 'application/json'

# =========================
# DATABASE CONFIGURATION
# =========================
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "dpg-d7jp6d7lk1mc739h879g-a"),
    "database": os.getenv("DB_NAME", "certify_db_eue5"),
    "user": os.getenv("DB_USER", "certify_user"),
    "password": os.getenv("DB_PASSWORD", "ce1oec6t5Bm2Yp3fi6XotFHzbCD0uEv3"),
    "port": os.getenv("DB_PORT", "5432")
}

def get_db():
    return psycopg2.connect(**DB_CONFIG, sslmode='require')

# =========================
# 🔧 FIXED: Flexible User Email Retrieval
# =========================
_USER_ID_COLUMN = None

def get_user_id_column(conn):
    """Auto-detect the user ID column name (user_id, id, uuid, uid)"""
    global _USER_ID_COLUMN
    if _USER_ID_COLUMN:
        return _USER_ID_COLUMN
    
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name IN ('user_id', 'id', 'uuid', 'uid')
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        for col in ['user_id', 'id', 'uuid', 'uid']:
            if col in columns:
                _USER_ID_COLUMN = col
                print(f"✅ Detected users table column: {col}")
                return col
    except:
        pass
    
    _USER_ID_COLUMN = 'user_id'
    return 'user_id'

def get_user_email(conn, current_user):
    """Get user email from users table by user ID"""
    try:
        cursor = conn.cursor()
        col = get_user_id_column(conn)
        cursor.execute(f"SELECT email FROM users WHERE {col} = %s", (current_user,))
        result = cursor.fetchone()
        return result[0] if result else None
    except Exception as e:
        print(f"⚠️ Error getting user email: {e}")
        return None

# =========================
# AUTH BLUEPRINT
# =========================
app.register_blueprint(auth_bp, url_prefix='/api/auth')

@app.route('/')
def home():
    return "CERTify API Running"

# =========================
# INITIALIZE DATABASE
# =========================
def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS saved_jobs CASCADE")
    cursor.execute("DROP TABLE IF EXISTS applications CASCADE")
    cursor.execute("DROP TABLE IF EXISTS jobs CASCADE")
    cursor.execute("DROP TABLE IF EXISTS companies CASCADE")

    cursor.execute("""
    CREATE TABLE companies (
        company_id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        location VARCHAR(255),
        industry VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE jobs (
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
        expiry_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        source VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cursor.execute("""
    CREATE TABLE saved_jobs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50),
        job_id VARCHAR(50),
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, job_id)
    );
    """)

    cursor.execute("""
    CREATE TABLE applications (
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
    print("✅ Database initialized")

def seed_json_data():
    api_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(api_dir)
    json_path = os.path.join(backend_dir, 'data', 'jobs_converted.json')
    
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
    except FileNotFoundError:
        print(f"⚠️  JSON file not found at {json_path}")
        return
    
    conn = get_db()
    cursor = conn.cursor()
    
    for job in json_data.get('jobs', []):
        company_name = job.get('company', 'Unknown')
        cursor.execute("SELECT company_id FROM companies WHERE name=%s", (company_name,))
        result = cursor.fetchone()
        
        if result:
            company_id = result[0]
        else:
            cursor.execute("INSERT INTO companies (name, location) VALUES (%s, %s) RETURNING company_id",
                         (company_name, job.get('location')))
            company_id = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO jobs (job_id, title, company_id, employer_id, location, job_type, salary_min, salary_max, description, posted_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active')
            ON CONFLICT (job_id) DO NOTHING
        """, (
            job.get('job_id'), 
            job.get('title'), 
            company_id, 
            None,
            job.get('location'), 
            job.get('type'),
            job.get('salary_min'), 
            job.get('salary_max'),
            job.get('description'), 
            job.get('posted_date')
        ))
    
    conn.commit()
    cursor.close()
    conn.close()
    print("✅ JSON data imported")

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
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/jobs')
def get_jobs():
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT 
                j.job_id,
                j.title,
                j.employer_id,
                c.name as company,
                j.location,
                j.job_type,
                j.salary_min,
                j.salary_max,
                j.description,
                j.posted_date,
                j.status
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

@app.route('/api/jobs', methods=['POST'])
@token_required
def create_job(current_user, current_user_type):
    try:
        data = request.get_json(force=True)
        job_id = f"JOB-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        conn = get_db()
        cursor = conn.cursor()
        company_name = data.get('company', 'Unknown')
        cursor.execute("SELECT company_id FROM companies WHERE name=%s", (company_name,))
        result = cursor.fetchone()
        if result:
            company_id = result[0]
        else:
            cursor.execute("INSERT INTO companies (name, location) VALUES (%s, %s) RETURNING company_id",
                         (company_name, data.get('location')))
            company_id = cursor.fetchone()[0]
        cursor.execute("""
            INSERT INTO jobs (job_id, title, company_id, employer_id, location, job_type, salary_min, salary_max, description, posted_date, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'active')
        """, (
            job_id,
            data.get('title'),
            company_id,
            current_user,
            data.get('location'),
            data.get('job_type'),
            data.get('salary_min'),
            data.get('salary_max'),
            data.get('description'),
            datetime.now().date()
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({
            "status": "success",
            "data": {"job_id": job_id}
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/jobs/<job_id>', methods=['DELETE'])
@token_required
def delete_job(current_user, current_user_type, job_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM jobs WHERE job_id=%s", (job_id,))
        conn.commit()
        return jsonify({"status": "success", "message": "Job deleted"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/jobs/<job_id>')
def get_job(job_id):
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT j.*, c.name as company
            FROM jobs j
            LEFT JOIN companies c ON j.company_id = c.company_id
            WHERE j.job_id=%s
        """, (job_id,))
        job = cursor.fetchone()
        return jsonify({
            "status": "success",
            "data": {"job": job}
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/jobs/<job_id>', methods=['PUT'])
@token_required
def update_job(current_user, current_user_type, job_id):
    try:
        data = request.get_json(force=True)
        conn = get_db()
        cursor = conn.cursor()
        
        # First verify the job exists and belongs to this employer
        cursor.execute("SELECT employer_id FROM jobs WHERE job_id = %s", (job_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({"status": "error", "message": "Job not found"}), 404
            
        # Optional: check if current_user owns this job
        # if result[0] != current_user:
        #     return jsonify({"status": "error", "message": "Unauthorized"}), 403
        
        # Handle company update
        company_name = data.get('company')
        company_id = None
        if company_name:
            cursor.execute("SELECT company_id FROM companies WHERE name = %s", (company_name,))
            comp_result = cursor.fetchone()
            if comp_result:
                company_id = comp_result[0]
            else:
                cursor.execute(
                    "INSERT INTO companies (name, location) VALUES (%s, %s) RETURNING company_id",
                    (company_name, data.get('location'))
                )
                company_id = cursor.fetchone()[0]
        
        # Build dynamic update query
        update_fields = []
        values = []
        
        if data.get('title'):
            update_fields.append("title = %s")
            values.append(data.get('title'))
        if company_id:
            update_fields.append("company_id = %s")
            values.append(company_id)
        if data.get('location'):
            update_fields.append("location = %s")
            values.append(data.get('location'))
        if data.get('job_type'):
            update_fields.append("job_type = %s")
            values.append(data.get('job_type'))
        if data.get('salary_min') is not None:
            update_fields.append("salary_min = %s")
            values.append(data.get('salary_min'))
        if data.get('salary_max') is not None:
            update_fields.append("salary_max = %s")
            values.append(data.get('salary_max'))
        if data.get('description'):
            update_fields.append("description = %s")
            values.append(data.get('description'))
        if data.get('status'):
            update_fields.append("status = %s")
            values.append(data.get('status'))
            
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        
        if not update_fields:
            return jsonify({"status": "error", "message": "No fields to update"}), 400
            
        values.append(job_id)
        
        query = f"UPDATE jobs SET {', '.join(update_fields)} WHERE job_id = %s"
        cursor.execute(query, values)
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "message": "Job updated successfully",
            "data": {"job_id": job_id}
        })
        
    except Exception as e:
        import traceback
        print(f"❌ UPDATE JOB ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/apply/<job_id>', methods=['POST'])
def apply_job(job_id):
    try:
        print(f"📨 APPLY: Content-Type = {request.content_type}")
        resume_url = None
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = {
                'name': request.form.get('name'),
                'email': request.form.get('email'),
                'phone': request.form.get('phone'),
                'cover_letter': request.form.get('cover_letter'),
                'headline': request.form.get('headline'),
                'years_experience': request.form.get('years_experience', 0)
            }
            if 'resume' in request.files:
                file = request.files['resume']
                if file and file.filename and allowed_file(file.filename):
                    original_filename = secure_filename(file.filename)
                    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{original_filename}"
                    filepath = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(filepath)
                    resume_url = f"/uploads/resumes/{filename}"
                    print(f"📄 Resume saved: {filepath}")
            print(f"📨 FormData: {data}")
        else:
            data = request.get_json(force=True, silent=True)
            print(f"📨 JSON: {data}")
        if not data or not data.get('name') or not data.get('email'):
            return jsonify({
                "status": "error", 
                "message": "Name and email are required"
            }), 400
        app_id = f"APP-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO applications (id, job_id, applicant_name, email, phone, cover_letter, headline, years_experience, resume_url, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
        """, (
            app_id,
            job_id,
            data.get('name'),
            data.get('email'),
            data.get('phone'),
            data.get('cover_letter'),
            data.get('headline'),
            data.get('years_experience', 0),
            resume_url
        ))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({
            "status": "success",
            "data": {"application_id": app_id, "resume_url": resume_url}
        })
    except Exception as e:
        import traceback
        print(f"❌ APPLY ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/uploads/resumes/<filename>')
def serve_resume(filename):
    try:
        return send_from_directory(UPLOAD_FOLDER, filename)
    except FileNotFoundError:
        return jsonify({"status": "error", "message": "File not found"}), 404

@app.route('/api/jobs/<job_id>/applicants')
@token_required
def get_job_applicants(current_user, current_user_type, job_id):
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT id as application_id, job_id, applicant_name, email, phone, cover_letter, headline, years_experience, resume_url, status, applied_at as created_at
            FROM applications 
            WHERE job_id=%s 
            ORDER BY applied_at DESC
        """, (job_id,))
        rows = cursor.fetchall()
        applicants = []
        for row in rows:
            name_parts = row['applicant_name'].split(' ', 1) if row['applicant_name'] else ['', '']
            applicants.append({
                'application_id': row['application_id'],
                'id': row['application_id'],
                'job_id': row['job_id'],
                'first_name': name_parts[0],
                'last_name': name_parts[1] if len(name_parts) > 1 else '',
                'email': row['email'],
                'phone': row['phone'],
                'headline': row['headline'] or 'Job Seeker',
                'years_experience': row['years_experience'] or 0,
                'resume_url': row['resume_url'],
                'status': row['status'],
                'applied_at': row['created_at'],
                'created_at': row['created_at']
            })
        return jsonify({
            "status": "success",
            "data": applicants
        })
    except Exception as e:
        import traceback
        print(f"❌ APPLICANTS ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/applications/<application_id>/status', methods=['PUT'])
@token_required
def update_application_status(current_user, current_user_type, application_id):
    try:
        data = request.get_json(force=True)
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE applications SET status=%s WHERE id=%s", (data.get("status"), application_id))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/saved-jobs', methods=['POST'])
@token_required
def save_job(current_user, current_user_type):
    try:
        data = request.get_json(force=True, silent=True)
        if not data:
            return jsonify({
                "status": "error", 
                "message": "No JSON data received"
            }), 400
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO saved_jobs (user_id, job_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, job_id) DO NOTHING
        """, (current_user, data.get("job_id")))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"status": "success", "message": "Job saved"})
    except Exception as e:
        import traceback
        print(f"❌ SAVE ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/saved-jobs/<job_id>', methods=['DELETE'])
@token_required
def unsave_job(current_user, current_user_type, job_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM saved_jobs WHERE user_id=%s AND job_id=%s", (current_user, job_id))
        conn.commit()
        return jsonify({"status": "success", "message": "Removed"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/saved-jobs', methods=['GET'])
@token_required
def get_saved_jobs(current_user, current_user_type):
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT j.job_id, j.title, c.name as company, j.location, j.job_type, j.salary_min, j.salary_max, j.description, j.posted_date, j.status
            FROM saved_jobs sj
            JOIN jobs j ON sj.job_id = j.job_id
            LEFT JOIN companies c ON j.company_id = c.company_id
            WHERE sj.user_id=%s
        """, (current_user,))
        jobs = cursor.fetchall()
        return jsonify({
            "status": "success",
            "data": {"saved_jobs": jobs}
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/saved-jobs/check/<job_id>', methods=['GET'])
@token_required
def check_saved(current_user, current_user_type, job_id):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM saved_jobs WHERE user_id=%s AND job_id=%s", (current_user, job_id))
        is_saved = cursor.fetchone() is not None
        return jsonify({"status": "success", "data": {"is_saved": is_saved}})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# =========================
# ✅ FIXED: GET MY APPLICATIONS (JOB SEEKER)
# =========================
@app.route('/api/my-applications', methods=['GET'])
@token_required
def get_my_applications(current_user, current_user_type):
    try:
        print(f"🔍 /api/my-applications called by user: {current_user}")
        
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        user_email = get_user_email(conn, current_user)
        
        print(f"✅ User email found: {user_email}")
        
        if not user_email:
            print(f"⚠️ No email found for user {current_user}, returning empty list")
            return jsonify({
                "status": "success",
                "data": []
            })

        cursor.execute("""
            SELECT 
                a.id as application_id,
                a.job_id,
                j.title as job_title,
                c.name as company_name,
                a.status,
                a.applied_at,
                a.applicant_name,
                a.email as app_email
            FROM applications a
            JOIN jobs j ON a.job_id = j.job_id
            LEFT JOIN companies c ON j.company_id = c.company_id
            WHERE a.email = %s
            ORDER BY a.applied_at DESC
        """, (user_email,))

        apps = cursor.fetchall()
        print(f"✅ Found {len(apps)} applications for email {user_email}")
        
        for app in apps:
            print(f"  - {app['application_id']}: {app['job_title']}")
        
        cursor.close()
        conn.close()

        result = []
        for app in apps:
            result.append({
                'application_id': app['application_id'],
                'job_id': app['job_id'],
                'job_title': app['job_title'],
                'company_name': app['company_name'],
                'status': app['status'],
                'applied_at': app['applied_at'].isoformat() if app['applied_at'] else None,
                'applicant_name': app['applicant_name']
            })

        return jsonify({
            "status": "success",
            "data": result
        })

    except Exception as e:
        import traceback
        print(f"❌ MY APPLICATIONS ERROR: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            "status": "error", 
            "message": str(e)
        }), 500

# =========================
# ✅ FIXED: DEBUG Check all applications
# =========================
@app.route('/api/debug/applications', methods=['GET'])
@token_required
def debug_applications(current_user, current_user_type):
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        user_email = get_user_email(conn, current_user)
        
        cursor.execute("SELECT id, email, job_id, applicant_name, status, applied_at FROM applications ORDER BY applied_at DESC LIMIT 20")
        all_apps = cursor.fetchall()
        
        user_apps = [app for app in all_apps if app['email'] == user_email]
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "status": "success",
            "current_user_id": current_user,
            "current_user_email": user_email,
            "your_applications_count": len(user_apps),
            "your_applications": user_apps,
            "all_applications_sample": all_apps[:5],
            "total_applications_in_db": len(all_apps)
        })
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

# =========================
# 🆕 FIXED: DASHBOARD RECENT APPLICATIONS
# =========================
@app.route('/api/dashboard/recent-applications', methods=['GET'])
@token_required
def get_recent_applications(current_user, current_user_type):
    try:
        conn = get_db()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        user_email = get_user_email(conn, current_user)

        if not user_email:
            print(f"⚠️ Dashboard: No email for user {current_user}")
            return jsonify({"status": "success", "data": []})

        print(f"✅ Dashboard: Loading applications for {user_email}")

        cursor.execute("""
            SELECT 
                a.id as application_id,
                a.job_id,
                j.title as job_title,
                c.name as company_name,
                a.status,
                a.applied_at
            FROM applications a
            JOIN jobs j ON a.job_id = j.job_id
            LEFT JOIN companies c ON j.company_id = c.company_id
            WHERE a.email = %s
            ORDER BY a.applied_at DESC
            LIMIT 5
        """, (user_email,))

        apps = cursor.fetchall()
        print(f"✅ Dashboard: Found {len(apps)} applications")

        result = [{
            "application_id": a["application_id"],
            "job_id": a["job_id"],
            "job_title": a["job_title"],
            "company_name": a["company_name"],
            "status": a["status"],
            "applied_at": a["applied_at"].isoformat() if a["applied_at"] else None
        } for a in apps]

        return jsonify({
            "status": "success",
            "data": result
        })

    except Exception as e:
        import traceback
        print("❌ DASHBOARD ERROR:", str(e))
        print(traceback.format_exc())
        return jsonify({"status": "error", "message": str(e)}), 500

# =========================
# RABBITMQ INTEGRATION (Message Storage)
# =========================

# Storage for messages
etl_messages = []

@app.route('/api/etl-log', methods=['POST'])
def receive_etl_log():
    """Receive messages from RabbitMQ consumer"""
    try:
        data = request.get_json(force=True)
        
        msg = {
            'id': len(etl_messages) + 1,
            'timestamp': datetime.now().isoformat(),
            'event': data.get('event'),
            'job_id': data.get('job_id'),
            'title': data.get('title'),
            'queue': data.get('queue', 'unknown'),
            'data': data
        }
        etl_messages.append(msg)
        
        # Print so you see it in Flask console
        print(f"\n📨 [RabbitMQ] {data.get('event')}: {data.get('title', 'N/A')}")
        
        return jsonify({'status': 'success', 'received': True}), 201
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/etl/status', methods=['GET'])
def get_etl_status():
    """Frontend polls this to get messages"""
    return jsonify({
        'status': 'success',
        'data': {
            'recent_logs': etl_messages[-20:],  # Last 20
            'total_messages': len(etl_messages)
        }
    })

# =========================
# START SERVER
# =========================
if __name__ == '__main__':
    init_auth_tables()
    init_db()
    seed_json_data()
    print("🚀 RUNNING ON http://localhost:5000")
    app.run(debug=True)
