"""
ETL Step 1: Convert XML to JSON (FIXED VERSION)
"""

import xml.etree.ElementTree as ET
import json
from datetime import datetime
from pathlib import Path


class XMLToJSONConverter:
    def __init__(self):
        # 📌 Project root
        self.base_dir = Path(__file__).resolve().parents[2]

        # 📥 INPUT: backend/data
        self.input_dir = self.base_dir / "backend" / "data"

        # 📤 OUTPUT: backend/data
        self.output_dir = self.base_dir / "backend" / "data"

        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.report = {
            "processed": 0,
            "errors": [],
            "converted": []
        }

    # =========================
    # ✅ FIXED METHODS INSIDE CLASS
    # =========================

    def parse_job(self, job_elem):

        salary = job_elem.find('salary')
        if salary is not None:
            salary_min = salary.findtext('min')
            salary_max = salary.findtext('max')
        else:
            salary_min = None
            salary_max = None

        return {
            "job_id": job_elem.get('id'),
            "title": self._get_text(job_elem, 'title'),
            "company": self._get_text(job_elem, 'company'),
            "location": self._get_text(job_elem, 'location'),
            "type": self._get_text(job_elem, 'type'),

            "salary_min": salary_min,
            "salary_max": salary_max,

            # XML uses <skills>
            "requirements": self._get_list(job_elem, 'skills/skill'),

            "description": self._get_text(job_elem, 'description'),
            "posted_date": self._get_text(job_elem, 'posted_date'),
            "expiry_date": self._get_text(job_elem, 'expiry_date'),

            "source": "legacy_xml",
            "converted_at": datetime.now().isoformat()
        }

    def _get_text(self, elem, tag, default=""):
        found = elem.find(tag)
        return found.text.strip() if found is not None and found.text else default

    def _get_list(self, elem, tag):
        return [item.text.strip() for item in elem.findall(tag) if item.text]

    # =========================

    def convert_file(self, xml_path):
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()

            jobs = [self.parse_job(job) for job in root.findall('job')]

            json_data = {
                "source_file": xml_path.name,
                "converted_at": datetime.now().isoformat(),
                "job_count": len(jobs),
                "jobs": jobs
            }

            json_path = self.output_dir / f"{xml_path.stem}_converted.json"

            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)

            self.report["processed"] += 1
            self.report["converted"].append({
                "xml": str(xml_path),
                "json": str(json_path),
                "records": len(jobs)
            })

            print(f"✅ Converted: {xml_path.name} → {json_path.name}")

            return True

        except Exception as e:
            self.report["errors"].append({"file": str(xml_path), "error": str(e)})
            print(f"❌ Error: {xml_path.name} - {e}")
            return False

    def convert_all(self):
        xml_files = list(self.input_dir.glob("*.xml"))

        print(f"📂 Looking in: {self.input_dir}")
        print(f"🔍 Found {len(xml_files)} XML files")

        for xml_file in xml_files:
            self.convert_file(xml_file)

        report_path = self.output_dir / "validation_report.json"

        with open(report_path, "w") as f:
            json.dump(self.report, f, indent=2)

        print(f"\n📊 Report saved: {report_path}")
        print(f"   Processed: {self.report['processed']}")
        print(f"   Errors: {len(self.report['errors'])}")

        return self.report


if __name__ == "__main__":
    converter = XMLToJSONConverter()
    converter.convert_all()