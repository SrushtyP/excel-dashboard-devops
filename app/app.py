from flask import Flask, render_template, jsonify, request
import json
import os
import threading
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

app = Flask(__name__)

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
INVENTORY_PATH = os.path.join(BASE_DIR, '..', 'inventory', 'inventory.json')
CONFIG_PATH    = os.path.join(BASE_DIR, '..', 'inventory', 'azure_config.json')

job_logs = {}

def load_inventory():
    with open(INVENTORY_PATH, 'r') as f:
        return json.load(f)

def save_inventory(data):
    with open(INVENTORY_PATH, 'w') as f:
        json.dump(data, f, indent=2)

def load_config():
    with open(CONFIG_PATH, 'r') as f:
        return json.load(f)

def get_azure_token(tenant_id, client_id, client_secret):
    url  = f"https://login.microsoftonline.com/{tenant_id}/oauth2/token"
    body = urllib.parse.urlencode({
        "grant_type"   : "client_credentials",
        "client_id"    : client_id,
        "client_secret": client_secret,
        "resource"     : "https://management.azure.com/"
    }).encode()
    req  = urllib.request.Request(url, data=body, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["access_token"]

def get_cost_data(token, subscription_id):
    today     = datetime.utcnow()
    from_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    to_date   = today.strftime("%Y-%m-%d")

    url     = (
        f"https://management.azure.com/subscriptions/{subscription_id}"
        f"/providers/Microsoft.CostManagement/query?api-version=2023-11-01"
    )
    payload = json.dumps({
        "type": "ActualCost",
        "dataSet": {
            "granularity": "Daily",
            "aggregation": {
                "totalCost": {
                    "name"    : "Cost",
                    "function": "Sum"
                }
            },
            "grouping": [
                {"type": "Dimension", "name": "ResourceGroupName"},
                {"type": "Dimension", "name": "ResourceType"}
            ]
        },
        "timeframe"  : "Custom",
        "timePeriod" : {
            "from": from_date,
            "to"  : to_date
        }
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type" : "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def get_daily_cost(token, subscription_id):
    today     = datetime.utcnow()
    from_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    to_date   = today.strftime("%Y-%m-%d")

    url     = (
        f"https://management.azure.com/subscriptions/{subscription_id}"
        f"/providers/Microsoft.CostManagement/query?api-version=2023-11-01"
    )
    payload = json.dumps({
        "type": "ActualCost",
        "dataSet": {
            "granularity": "Daily",
            "aggregation": {
                "totalCost": {
                    "name"    : "Cost",
                    "function": "Sum"
                }
            }
        },
        "timeframe" : "Custom",
        "timePeriod": {
            "from": from_date,
            "to"  : to_date
        }
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type" : "application/json"
        },
        method="POST"
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def run_job(vm_id, vm_name, action):
    logs = []
    job_logs[vm_id] = {"status": "running", "logs": logs}

    def log(msg):
        logs.append(msg)

    try:
        log(f"Processing request: {vm_name} -> {action.upper()}")
        log(f"Updating inventory state...")

        data = load_inventory()
        for vm in data["vms"]:
            if vm["id"] == vm_id:
                vm["desired_state"] = action
        save_inventory(data)

        log(f"Inventory updated successfully.")
        log(f"VM '{vm_name}' desired state set to {action.upper()}.")
        log(f"To provision this change on Azure, push a commit to trigger the GitHub Actions pipeline.")
        job_logs[vm_id]["status"] = "done"

    except Exception as e:
        log(f"Error: {str(e)}")
        job_logs[vm_id]["status"] = "failed"

# ── Routes ────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/vms')
def get_vms():
    return jsonify(load_inventory())

@app.route('/api/summary')
def get_summary():
    data = load_inventory()
    return jsonify(data['total_cost_summary'])

@app.route('/api/costs')
def get_costs():
    try:
        config          = load_config()
        token           = get_azure_token(
                            config["tenant_id"],
                            config["client_id"],
                            config["client_secret"]
                          )
        cost_data       = get_cost_data(token, config["subscription_id"])
        daily_data      = get_daily_cost(token, config["subscription_id"])

        # Process grouped cost data
        rows     = cost_data.get("properties", {}).get("rows", [])
        columns  = cost_data.get("properties", {}).get("columns", [])
        col_names = [c["name"] for c in columns]

        grouped = {}
        for row in rows:
            row_dict = dict(zip(col_names, row))
            rg       = row_dict.get("ResourceGroupName", "Unknown")
            cost_usd = float(row_dict.get("Cost", 0))
            cost_inr = round(cost_usd * 83.5, 2)
            grouped[rg] = grouped.get(rg, 0) + cost_inr

        # Process daily trend
        daily_rows    = daily_data.get("properties", {}).get("rows", [])
        daily_columns = daily_data.get("properties", {}).get("columns", [])
        daily_cols    = [c["name"] for c in daily_columns]

        daily_trend = []
        for row in daily_rows:
            d        = dict(zip(daily_cols, row))
            date_str = str(d.get("UsageDate", ""))
            cost_usd = float(d.get("Cost", 0))
            cost_inr = round(cost_usd * 83.5, 2)
            if date_str and len(date_str) == 8:
                formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
            else:
                formatted = date_str
            daily_trend.append({"date": formatted, "cost_inr": cost_inr})

        daily_trend.sort(key=lambda x: x["date"])

        # Strategy comparison using inventory data
        inv = load_inventory()
        usd_to_inr     = 83.5
        hourly_usd     = 0.096
        always_on_inr  = round(hourly_usd * 24 * 30 * usd_to_inr, 2)
        snoozed_inr    = round(hourly_usd * 12 * 22 * usd_to_inr, 2)
        destroyed_inr  = 0

        strategy_comparison = [
            {
                "label"       : "Always On",
                "cost_inr"    : always_on_inr,
                "hours_per_mo": 720,
                "description" : "24/7 running"
            },
            {
                "label"       : "Snoozed",
                "cost_inr"    : snoozed_inr,
                "hours_per_mo": 264,
                "description" : "8am-8pm IST weekdays"
            },
            {
                "label"       : "Destroyed",
                "cost_inr"    : destroyed_inr,
                "hours_per_mo": 0,
                "description" : "Ephemeral only"
            }
        ]

        return jsonify({
            "by_resource_group" : grouped,
            "daily_trend"       : daily_trend,
            "strategy_comparison": strategy_comparison,
            "last_updated"      : datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/invoke', methods=['POST'])
def invoke_vm():
    body   = request.get_json()
    vm_id  = body.get('vm_id')
    action = body.get('action')

    data = load_inventory()
    vm   = next((v for v in data['vms'] if v['id'] == vm_id), None)

    if not vm:
        return jsonify({"error": "VM not found"}), 404
    if action not in ["running", "snoozed", "destroyed"]:
        return jsonify({"error": "Invalid action"}), 400

    thread = threading.Thread(
        target=run_job, args=(vm_id, vm['name'], action)
    )
    thread.daemon = True
    thread.start()

    return jsonify({
        "message": f"Job started for {vm['name']} -> {action}",
        "vm_id"  : vm_id,
        "action" : action
    })

@app.route('/api/status/<vm_id>')
def get_status(vm_id):
    job = job_logs.get(vm_id, {"status": "idle", "logs": []})
    return jsonify(job)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)