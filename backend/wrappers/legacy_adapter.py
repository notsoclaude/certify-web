"""
Legacy System Adapter - Connects to old SOAP/XML systems
(Working demo version for CERTify)
"""

import requests
import json
from datetime import datetime
from xml.etree import ElementTree as ET
from flask import jsonify, request


class LegacySystemAdapter:
    """
    Adapter Pattern: Converts legacy SOAP XML → REST JSON
    """

    def __init__(self, endpoint="http://localhost:8080/legacy"):
        self.endpoint = endpoint
        self.headers = {
            "Content-Type": "text/xml",
            "SOAPAction": '""'
        }

    # -------------------------
    # SOAP REQUEST
    # -------------------------
    def _make_soap_request(self, soap_body):
        envelope = f"""<?xml version="1.0"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
            <soap:Body>
                {soap_body}
            </soap:Body>
        </soap:Envelope>"""

        try:
            response = requests.post(
                self.endpoint,
                data=envelope,
                headers=self.headers,
                timeout=10
            )
            return response.text
        except Exception as e:
            print("SOAP Error:", e)
            return None

    # -------------------------
    # XML PARSER
    # -------------------------
    def _parse_xml(self, xml_string):
        try:
            return ET.fromstring(xml_string)
        except Exception as e:
            print("Parse Error:", e)
            return None

    # -------------------------
    # GET EMPLOYEE (SOAP → JSON)
    # -------------------------
    def get_employee(self, employee_id):

        soap_body = f"""
            <GetEmployeeRequest>
                <EmployeeID>{employee_id}</EmployeeID>
            </GetEmployeeRequest>
        """

        xml_response = self._make_soap_request(soap_body)

        # 🧪 DEMO FALLBACK (since no real SOAP server)
        if not xml_response:
            xml_response = f"""
            <GetEmployeeResponse>
                <Employee>
                    <ID>{employee_id}</ID>
                    <Name>Juan Dela Cruz</Name>
                    <Department>IT</Department>
                </Employee>
            </GetEmployeeResponse>
            """

        root = self._parse_xml(xml_response)

        if root is None:
            return {"status": "error", "message": "Invalid XML"}

        # Extract data safely
        employee_node = root.find(".//Employee")

        employee = {
            "id": employee_node.findtext("ID") if employee_node is not None else employee_id,
            "name": employee_node.findtext("Name") if employee_node is not None else "Unknown",
            "department": employee_node.findtext("Department") if employee_node is not None else "Unknown",
            "source": "legacy_system",
            "transformed_at": datetime.now().isoformat()
        }

        return {
            "status": "success",
            "data": employee
        }

    # -------------------------
    # SEARCH EMPLOYEES
    # -------------------------
    def search_employees(self, department=""):
        return {
            "status": "success",
            "data": [],
            "message": "Demo mode - no real SOAP backend connected"
        }


# -------------------------
# FLASK ROUTES
# -------------------------
def create_adapter_routes(app):
    adapter = LegacySystemAdapter()

    @app.route('/api/legacy/employees/<employee_id>', methods=['GET'])
    def get_legacy_employee(employee_id):
        return jsonify(adapter.get_employee(employee_id))

    @app.route('/api/legacy/employees', methods=['GET'])
    def search_legacy_employees():
        dept = request.args.get("department", "")
        return jsonify(adapter.search_employees(dept))


# -------------------------
# TEST RUN
# -------------------------
if __name__ == "__main__":
    adapter = LegacySystemAdapter()
    result = adapter.get_employee("EMP001")
    print(json.dumps(result, indent=2))