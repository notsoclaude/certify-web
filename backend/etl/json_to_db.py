"""
ETL Step 2: Load JSON into PostgreSQL (FULL FIXED VERSION)
"""

import json
import psycopg2
from pathlib import Path
import hashlib


# -----------------------------
# SAFE DATE HANDLER
# -----------------------------
def safe_date(value):
    """Convert empty string to None for PostgreSQL"""
    if not value or str(value).strip() == "":
        return None
    return value


# -----------------------------
# STABLE JOB ID GENERATOR (FIXED)
# -----------------------------
def generate_job_id(job):
    """Create consistent job ID (NO MORE RANDOM HASH BUG)"""
    base = job.get("title", "") + job.get("company", "")
    return "JOB-" + hashlib.md5(base.encode()).hexdigest()[:10]


# -----------------------------
# MAIN ETL FUNCTION
# -----------------------------
def load_json_to_db():

    # 📌 ROOT DIRECTORY (matches Step 1)
    base_dir = Path(__file__).resolve().parents[2]

    # 📥 INPUT: backend/data/
    json_dir = base_dir / "backend" / "data"

    json_files = [
        f for f in json_dir.glob("*.json")
        if f.name != "validation_report.json"
    ]

    print(f"🔍 Found {len(json_files)} JSON files in {json_dir}")

    # -----------------------------
    # DATABASE CONNECTION
    # -----------------------------
    conn = psycopg2.connect(
        host="localhost",
        database="certify_db",
        user="postgres",
        password="shanlhiemenez",
        port="5432"
    )

    cursor = conn.cursor()

    # -----------------------------
    # PROCESS FILES
    # -----------------------------
    for file in json_files:
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)

            jobs = data.get("jobs", [])

            for job in jobs:

                # skip invalid records
                if not job.get("title") or not job.get("company"):
                    continue

                job_id = generate_job_id(job)

                # -------------------------
                # COMPANY INSERT / FETCH
                # -------------------------
                cursor.execute("""
                    SELECT company_id FROM companies WHERE name=%s
                """, (job["company"],))

                row = cursor.fetchone()

                if row:
                    company_id = row[0]
                else:
                    cursor.execute("""
                        INSERT INTO companies (name, location)
                        VALUES (%s, %s)
                        RETURNING company_id
                    """, (job["company"], job.get("location")))
                    company_id = cursor.fetchone()[0]

                # -------------------------
                # JOB INSERT
                # -------------------------
                cursor.execute("""
                    INSERT INTO jobs (
                        job_id, title, company_id, location,
                        job_type, description, requirements,
                        posted_date, expiry_date, source, status
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'active')
                    ON CONFLICT (job_id) DO NOTHING
                """, (
                    job_id,
                    job["title"],
                    company_id,
                    job.get("location"),
                    job.get("type"),
                    job.get("description", ""),
                    job.get("requirements", []),
                    safe_date(job.get("posted_date")),
                    safe_date(job.get("expiry_date")),
                    job.get("source", "legacy_xml")
                ))

            conn.commit()
            print(f"✅ Loaded: {file.name}")

        except Exception as e:
            conn.rollback()
            print(f"❌ Error: {file.name} - {e}")

    cursor.close()
    conn.close()

    print("\n📊 DONE: All JSON files processed successfully!")


# -----------------------------
# RUN SCRIPT
# -----------------------------
if __name__ == "__main__":
    load_json_to_db()