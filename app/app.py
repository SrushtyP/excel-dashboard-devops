from flask import Flask, render_template, jsonify, request
import json
import os
import subprocess
import threading

app = Flask(__name__)

BASE_DIR       = os.path.dirname(os.path.abspath(__file__))
INVENTORY_PATH = os.path.join(BASE_DIR, '..', 'inventory', 'inventory.json')
TERRAFORM_DIR  = os.path.join(BASE_DIR, '..', 'terraform')
ANSIBLE_DIR    = os.path.join(BASE_DIR, '..', 'ansible')

PLAYBOOK_MAP = {
    "running" : "playbook-running.yml",
    "snoozed" : "playbook-snooze.yml",
    "destroyed": "playbook-destroy.yml"
}

job_logs = {}

def load_inventory():
    with open(INVENTORY_PATH, 'r') as f:
        return json.load(f)

def save_inventory(data):
    with open(INVENTORY_PATH, 'w') as f:
        json.dump(data, f, indent=2)

def run_job(vm_id, vm_name, action):
    logs = []
    job_logs[vm_id] = {"status": "running", "logs": logs}

    def log(msg):
        logs.append(msg)

    try:
        # Step 1 — Terraform
        log(f"Starting Terraform for {vm_name} -> {action.upper()}")
        tf_cmd = [
            "terraform", "apply", "-auto-approve",
            "-var-file=terraform.tfvars"
        ]
        tf = subprocess.run(tf_cmd, cwd=TERRAFORM_DIR,
                            capture_output=True, text=True)
        log(tf.stdout)
        if tf.returncode != 0:
            log(f"Terraform failed: {tf.stderr}")
            job_logs[vm_id]["status"] = "failed"
            return
        log("Terraform complete")

        # Step 2 — Ansible
        playbook_file = PLAYBOOK_MAP.get(action)
        if playbook_file:
            log(f"Starting Ansible playbook: {playbook_file}")
            playbook  = os.path.join(ANSIBLE_DIR, playbook_file)
            inventory = os.path.join(ANSIBLE_DIR, "inventory.ini")
            ans_cmd   = ["ansible-playbook", "-i", inventory, playbook]
            ans = subprocess.run(ans_cmd, capture_output=True, text=True)
            log(ans.stdout)
            if ans.returncode != 0:
                log(f"Ansible failed: {ans.stderr}")
                job_logs[vm_id]["status"] = "failed"
                return
            log("Ansible complete")

        # Step 3 — Update inventory
        data = load_inventory()
        for vm in data["vms"]:
            if vm["id"] == vm_id:
                vm["desired_state"] = action
        save_inventory(data)

        log(f"VM {vm_name} successfully set to {action.upper()}")
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

@app.route('/api/invoke', methods=['POST'])
def invoke_vm():
    body   = request.get_json()
    vm_id  = body.get('vm_id')
    action = body.get('action')

    data = load_inventory()
    vm   = next((v for v in data['vms'] if v['id'] == vm_id), None)

    if not vm:
        return jsonify({"error": "VM not found"}), 404
    if action not in PLAYBOOK_MAP:
        return jsonify({"error": "Invalid action"}), 400

    thread = threading.Thread(
        target=run_job, args=(vm_id, vm['name'], action)
    )
    thread.daemon = True
    thread.start()

    return jsonify({
        "message": f"Job started for {vm['name']} -> {action}",
        "vm_id": vm_id,
        "action": action
    })

@app.route('/api/status/<vm_id>')
def get_status(vm_id):
    job = job_logs.get(vm_id, {"status": "idle", "logs": []})
    return jsonify(job)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)