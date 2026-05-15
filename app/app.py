import os
import json
import re
import subprocess
import requests
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../frontend-dist', static_url_path='')
CORS(app)

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INVENTORY_YML  = os.path.join(BASE_DIR, 'inventory.yml')
INVENTORY_JSON = os.path.join(BASE_DIR, 'inventory', 'inventory.json')
AZURE_CFG      = os.path.join(BASE_DIR, 'inventory', 'azure_config.json')


# ── React frontend ────────────────────────────────────────────────────────────
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    full = os.path.join(app.static_folder, path)
    if os.path.exists(full):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


# ── Helpers ───────────────────────────────────────────────────────────────────
def _azure_credential():
    from azure.identity import ClientSecretCredential
    try:
        with open(AZURE_CFG) as f:
            cfg = json.load(f)
        return ClientSecretCredential(
            tenant_id=cfg['tenant_id'].strip(),
            client_id=cfg['client_id'].strip(),
            client_secret=cfg['client_secret'].strip(),
        ), cfg['subscription_id'].strip()
    except Exception:
        return ClientSecretCredential(
            tenant_id=os.environ['AZURE_TENANT_ID'],
            client_id=os.environ['AZURE_CLIENT_ID'],
            client_secret=os.environ['AZURE_CLIENT_SECRET'],
        ), os.environ['AZURE_SUBSCRIPTION_ID']


def _load_inv():
    with open(INVENTORY_JSON) as f:
        return json.load(f)


def _dur(s, e):
    if not s or not e:
        return None
    try:
        fmt = '%Y-%m-%dT%H:%M:%SZ'
        sec = int((datetime.strptime(e, fmt) - datetime.strptime(s, fmt)).total_seconds())
        return f'{sec}s' if sec < 60 else f'{sec//60}m {sec%60:02d}s'
    except Exception:
        return None


def _inv_fallback(error_msg):
    inv = _load_inv()
    vms = []
    for v in inv.get('vms', []):
        sp = v.get('specs', {}); co = v.get('cost', {})
        vms.append({
            'id': v['id'], 'alias': v.get('alias', v['id']), 'fullName': v['id'],
            'purpose': v.get('business_need', '')[:80],
            'state': v.get('desired_state', 'offline'), 'azureState': 'fallback',
            'cpu': sp.get('cpu', 2), 'memGb': sp.get('memory_gb', 8),
            'diskGb': sp.get('disk_gb', 30), 'size': sp.get('vm_size', ''),
            'costHrInr': co.get('hourly_inr', 0), 'monthlyInr': co.get('monthly_inr', 0),
            'optimisedMonthlyInr': co.get('optimized_monthly_inr', 0),
            'savingsInr': co.get('savings_inr', 0),
            'contact': v.get('contact', ''), 'unit': v.get('business_unit', ''),
            'environment': v.get('environment', ''), 'priority': v.get('priority', ''),
            'businessNeed': v.get('business_need', ''), 'snooze': None, 'uptime': '—',
        })
    return jsonify({'vms': vms, 'synced': datetime.utcnow().isoformat(),
                    'live': False, 'error': error_msg})


# ── GET /api/health ───────────────────────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'time': datetime.utcnow().isoformat()})


# ── GET /api/inventory ────────────────────────────────────────────────────────
@app.route('/api/inventory')
def get_inventory():
    try:
        return jsonify(_load_inv())
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── GET /api/vms ──────────────────────────────────────────────────────────────
@app.route('/api/vms')
def get_vms():
    try:
        from azure.mgmt.compute import ComputeManagementClient
        cred, sub_id = _azure_credential()
        compute = ComputeManagementClient(cred, sub_id)
        inv = _load_inv()
        inv_map = {v['id']: v for v in inv.get('vms', [])}
        rg = os.environ.get('AZURE_RESOURCE_GROUP', 'excel-dashboard-rg')

        result = []
        for vm in compute.virtual_machines.list(rg):
            iv = compute.virtual_machines.instance_view(rg, vm.name)
            power = next((s.code.replace('PowerState/', '')
                          for s in iv.statuses if s.code.startswith('PowerState/')), 'unknown')
            state_map = {
                'running': 'running', 'starting': 'running',
                'deallocated': 'destroyed', 'deallocating': 'destroyed',
                'stopped': 'snoozed', 'stopping': 'snoozed',
            }
            our_state = state_map.get(power, 'offline')
            meta = inv_map.get(vm.name, {})
            sp = meta.get('specs', {}); co = meta.get('cost', {})
            result.append({
                'id': vm.name, 'alias': meta.get('alias', vm.name),
                'fullName': vm.name, 'purpose': meta.get('business_need', '')[:80],
                'state': our_state, 'azureState': power,
                'cpu': sp.get('cpu', 2), 'memGb': sp.get('memory_gb', 8),
                'diskGb': sp.get('disk_gb', 30),
                'size': vm.hardware_profile.vm_size if vm.hardware_profile else sp.get('vm_size', ''),
                'costHrInr': co.get('hourly_inr', 0), 'monthlyInr': co.get('monthly_inr', 0),
                'optimisedMonthlyInr': co.get('optimized_monthly_inr', 0),
                'savingsInr': co.get('savings_inr', 0),
                'contact': meta.get('contact', ''), 'unit': meta.get('business_unit', ''),
                'environment': meta.get('environment', ''), 'priority': meta.get('priority', ''),
                'businessNeed': meta.get('business_need', ''), 'snooze': None, 'uptime': '—',
            })
        return jsonify({'vms': result, 'synced': datetime.utcnow().isoformat(), 'live': True})
    except ImportError:
        return _inv_fallback('azure-mgmt-compute not installed')
    except Exception as e:
        try:
            return _inv_fallback(str(e))
        except Exception as e2:
            return jsonify({'error': str(e2), 'vms': []}), 500


# ── GET /api/pipeline/runs ────────────────────────────────────────────────────
@app.route('/api/pipeline/runs')
def get_pipeline_runs():
    token = os.environ.get('GITHUB_TOKEN')
    owner = os.environ.get('GITHUB_OWNER', '')
    repo  = os.environ.get('GITHUB_REPO', 'excel-dashboard-devops')
    if not token or not owner:
        return jsonify({'error': 'GITHUB_TOKEN or GITHUB_OWNER not set', 'runs': []}), 503
    try:
        h = {'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'}
        r = requests.get(
            f'https://api.github.com/repos/{owner}/{repo}/actions/workflows/deploy.yml/runs?per_page=10',
            headers=h, timeout=10)
        r.raise_for_status()
        result = []
        for run in r.json().get('workflow_runs', []):
            jr = requests.get(
                f'https://api.github.com/repos/{owner}/{repo}/actions/runs/{run["id"]}/jobs',
                headers=h, timeout=10)
            jobs = []
            for j in (jr.json().get('jobs', []) if jr.ok else []):
                status = j.get('conclusion') or j.get('status', 'pending')
                jobs.append({'name': j['name'],
                             'status': 'running' if status == 'in_progress' else status,
                             'duration': _dur(j.get('started_at'), j.get('completed_at')),
                             'error': None})
            result.append({
                'id': run['id'], 'sha': run['head_sha'][:7], 'branch': run['head_branch'],
                'commit': run['display_title'], 'actor': run['actor']['login'],
                'status': run.get('conclusion') or 'running',
                'startedAt': run['created_at'],
                'duration': _dur(run.get('created_at'), run.get('updated_at')),
                'jobs': jobs,
            })
        return jsonify({'runs': result, 'synced': datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({'error': str(e), 'runs': []}), 500


# ── GET /api/cost ─────────────────────────────────────────────────────────────
@app.route('/api/cost')
def get_cost():
    try:
        from azure.mgmt.costmanagement import CostManagementClient
        from azure.mgmt.costmanagement.models import (
            QueryDefinition, QueryTimePeriod, QueryDataset,
            QueryAggregation, QueryGrouping)
        cred, sub_id = _azure_credential()
        client = CostManagementClient(cred)
        now   = datetime.utcnow()
        start = now.replace(day=1).strftime('%Y-%m-%d')
        end   = now.strftime('%Y-%m-%d')
        query = QueryDefinition(
            type='ActualCost', timeframe='Custom',
            time_period=QueryTimePeriod(from_property=start, to=end),
            dataset=QueryDataset(
                granularity='None',
                aggregation={'totalCost': QueryAggregation(name='Cost', function='Sum')},
                grouping=[QueryGrouping(type='Dimension', name='ResourceGroupName')]),
        )
        res = client.query.usage(f'/subscriptions/{sub_id}', query)
        total_usd = sum(row[0] for row in (res.rows or []))
        total_inr = round(total_usd * 84.0)
        return jsonify({'monthlyActualInr': total_inr, 'monthlyActualUsd': round(total_usd, 2),
                        'currencyRate': 84.0, 'period': f'{start} to {end}',
                        'synced': datetime.utcnow().isoformat()})
    except ImportError:
        return jsonify({'error': 'azure-mgmt-costmanagement not installed'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── POST /api/vms/<vm_id>/request-state ──────────────────────────────────────
@app.route('/api/vms/<vm_id>/request-state', methods=['POST'])
def request_vm_state(vm_id):
    try:
        body      = request.get_json()
        new_state = body.get('state', '')
        if new_state not in {'running', 'snoozed', 'destroyed'}:
            return jsonify({'error': f'Invalid state "{new_state}"'}), 400

        with open(INVENTORY_YML, 'r') as f:
            content = f.read()

        # Find the VM block and patch state + enabled
        pattern = r'(- name: ' + re.escape(vm_id) + r'\b.*?)(?=\n  - name:|\Z)'
        match = re.search(pattern, content, re.DOTALL)
        if not match:
            return jsonify({'error': f'VM "{vm_id}" not found in inventory.yml'}), 404

        block = match.group(1)
        block = re.sub(r'(state:\s*)\S+', r'\g<1>' + new_state, block)
        block = re.sub(r'(enabled:\s*)\S+',
                       r'\g<1>' + ('false' if new_state == 'destroyed' else 'true'), block)
        patched = content[:match.start()] + block + content[match.end():]

        with open(INVENTORY_YML, 'w') as f:
            f.write(patched)

        # Sync inventory.json desired_state
        try:
            with open(INVENTORY_JSON) as f:
                inv = json.load(f)
            for v in inv.get('vms', []):
                if v['id'] == vm_id:
                    v['desired_state'] = new_state
            with open(INVENTORY_JSON, 'w') as f:
                json.dump(inv, f, indent=2)
        except Exception:
            pass

        # Git commit + push → triggers GitHub Actions pipeline
        commit_msg = f'chore: set {vm_id} to {new_state} via IM dashboard'
        subprocess.run(['git', 'add', INVENTORY_YML, INVENTORY_JSON],
                       check=True, cwd=BASE_DIR, capture_output=True)
        subprocess.run(['git', 'commit', '-m', commit_msg],
                       check=True, cwd=BASE_DIR, capture_output=True)
        subprocess.run(['git', 'push'], check=True, cwd=BASE_DIR, capture_output=True)

        return jsonify({'accepted': True, 'vm': vm_id, 'requestedState': new_state,
                        'message': 'inventory.yml updated and pushed. Pipeline starting.'})
    except subprocess.CalledProcessError as e:
        return jsonify({'error': f'Git error: {e.stderr.decode() if e.stderr else str(e)}',
                        'accepted': False}), 500
    except Exception as e:
        return jsonify({'error': str(e), 'accepted': False}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)