import os
import json
import requests
from datetime import datetime, timedelta

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='../frontend-dist', static_url_path='')
CORS(app)

BASE_DIR       = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INVENTORY_JSON = os.path.join(BASE_DIR, 'inventory', 'inventory.json')
AZURE_CFG      = os.path.join(BASE_DIR, 'inventory', 'azure_config.json')
PENDING_LOG    = os.path.join(BASE_DIR, 'inventory', 'pending_requests.json')


# ── React frontend ─────────────────────────────────────────────────────────────
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    full = os.path.join(app.static_folder, path)
    if os.path.exists(full):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


# ── Helpers ────────────────────────────────────────────────────────────────────
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
            'costHrUsd': co.get('hourly_usd') or round(co.get('hourly_inr', 0) / 84.0, 4),
            'monthlyUsd': co.get('monthly_usd') or round(co.get('monthly_inr', 0) / 84.0, 2),
            'optimisedMonthlyUsd': co.get('optimized_monthly_usd') or round(co.get('optimized_monthly_inr', 0) / 84.0, 2),
            'savingsUsd': co.get('savings_usd') or round(co.get('savings_inr', 0) / 84.0, 2),
            'costHrInr': co.get('hourly_inr', 0),
            'monthlyInr': co.get('monthly_inr', 0),
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
        rg = os.environ.get('AZURE_RESOURCE_GROUP', 'rg-dashboard-demo')

        result = []
        for vm in compute.virtual_machines.list(rg):
            iv = compute.virtual_machines.instance_view(rg, vm.name)
            power = next((s.code.replace('PowerState/', '')
                          for s in iv.statuses if s.code.startswith('PowerState/')), 'unknown')
            state_map = {
                'running': 'running', 'starting': 'running',
                'deallocated': 'snoozed', 'deallocating': 'snoozed',
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
                'costHrUsd': co.get('hourly_usd') or round(co.get('hourly_inr', 0) / 84.0, 4),
                'monthlyUsd': co.get('monthly_usd') or round(co.get('monthly_inr', 0) / 84.0, 2),
                'optimisedMonthlyUsd': co.get('optimized_monthly_usd') or round(co.get('optimized_monthly_inr', 0) / 84.0, 2),
                'savingsUsd': co.get('savings_usd') or round(co.get('savings_inr', 0) / 84.0, 2),
                'costHrInr': co.get('hourly_inr', 0),
                'monthlyInr': co.get('monthly_inr', 0),
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
    token = os.environ.get('PAT_TOKEN')
    owner = os.environ.get('OWNER', '')
    repo  = os.environ.get('REPO', 'excel-dashboard-devops')
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
# Uses Azure REST API directly with bearer token — same approach as the old
# HTML app that successfully returned real cost data on free trial.
# No SDK needed: just requests + oauth2 token + management.azure.com endpoints.
@app.route('/api/cost')
def get_cost():
    import calendar
    try:
        # ── Step 1: get bearer token via client_credentials ───────────────────
        with open(AZURE_CFG) as f:
            cfg = json.load(f)
        tenant_id     = cfg['tenant_id'].strip()
        client_id     = cfg['client_id'].strip()
        client_secret = cfg['client_secret'].strip()
        sub_id        = cfg['subscription_id'].strip()

        token_url = f'https://login.microsoftonline.com/{tenant_id}/oauth2/token'
        token_res = requests.post(token_url, data={
            'grant_type':    'client_credentials',
            'client_id':     client_id,
            'client_secret': client_secret,
            'resource':      'https://management.azure.com/',
        }, timeout=15)
        token_res.raise_for_status()
        bearer = token_res.json()['access_token']
        headers = {'Authorization': f'Bearer {bearer}', 'Content-Type': 'application/json'}

        now       = datetime.utcnow()
        mtd_start = now.replace(day=1).strftime('%Y-%m-%d')
        start_30  = (now - __import__('datetime').timedelta(days=29)).strftime('%Y-%m-%d')
        end_date  = now.strftime('%Y-%m-%d')

        # ── Step 2: Cost Management Query API (same endpoint old app used) ─────
        scope     = f'/subscriptions/{sub_id}'
        query_url = f'https://management.azure.com{scope}/providers/Microsoft.CostManagement/query?api-version=2023-11-01'

        # Query 1: MTD total by resource group
        q_rg = {
            'type': 'ActualCost', 'timeframe': 'Custom',
            'timePeriod': {'from': mtd_start, 'to': end_date},
            'dataset': {
                'granularity': 'None',
                'aggregation': {'totalCost': {'name': 'Cost', 'function': 'Sum'}},
                'grouping': [{'type': 'Dimension', 'name': 'ResourceGroupName'}],
            }
        }
        r_rg = requests.post(query_url, headers=headers, json=q_rg, timeout=20)

        # Query 2: Daily trend last 30 days
        q_daily = {
            'type': 'ActualCost', 'timeframe': 'Custom',
            'timePeriod': {'from': start_30, 'to': end_date},
            'dataset': {
                'granularity': 'Daily',
                'aggregation': {'totalCost': {'name': 'Cost', 'function': 'Sum'}},
            }
        }
        r_daily = requests.post(query_url, headers=headers, json=q_daily, timeout=20)

        # ── Step 3: Parse results ─────────────────────────────────────────────
        total_mtd = 0.0
        by_rg     = {}
        if r_rg.ok:
            rg_data = r_rg.json()
            cols    = [c['name'].lower() for c in rg_data.get('properties', {}).get('columns', [])]
            cost_i  = next((i for i,c in enumerate(cols) if 'cost' in c), 0)
            rg_i    = next((i for i,c in enumerate(cols) if 'resource' in c), 1)
            for row in rg_data.get('properties', {}).get('rows', []):
                cost = float(row[cost_i] or 0)
                rg   = str(row[rg_i] or 'unknown').lower()
                total_mtd       += cost
                by_rg[rg]        = round(by_rg.get(rg, 0) + cost, 4)

        daily_list = []
        if r_daily.ok:
            d_data = r_daily.json()
            cols   = [c['name'].lower() for c in d_data.get('properties', {}).get('columns', [])]
            cost_i = next((i for i,c in enumerate(cols) if 'cost' in c), 0)
            date_i = next((i for i,c in enumerate(cols) if 'date' in c or 'usage' in c), 1)
            for row in d_data.get('properties', {}).get('rows', []):
                cost    = float(row[cost_i] or 0)
                raw_d   = str(row[date_i])
                date_str = f'{raw_d[:4]}-{raw_d[4:6]}-{raw_d[6:8]}' if len(raw_d) == 8 else raw_d[:10]
                daily_list.append({'date': date_str, 'costUsd': round(cost, 4)})
            daily_list.sort(key=lambda x: x['date'])

        total_mtd        = round(total_mtd, 4)
        day_of_month     = max(now.day, 1)
        days_in_month    = calendar.monthrange(now.year, now.month)[1]
        projected_usd    = round((total_mtd / day_of_month) * days_in_month, 4)

        return jsonify({
            'currency':          'USD',
            'period':            f'{mtd_start} to {end_date}',
            'totalMtdUsd':       total_mtd,
            'total30dUsd':       total_mtd,
            'projectedMonthUsd': projected_usd,
            'lastMonthUsd':      0,
            'momChangePct':      0,
            'byResourceGroup':   by_rg,
            'dailyBreakdown':    daily_list,
            'byService':         [],
            'byResource':        [],
            'synced':            datetime.utcnow().isoformat(),
            'live':              True,
            'source':            'Azure Cost Management REST API (bearer token)',
            'debug': {
                'rg_status':    r_rg.status_code if r_rg else 'n/a',
                'daily_status': r_daily.status_code if r_daily else 'n/a',
            }
        })

    except Exception as e:
        return jsonify({
            'currency': 'USD', 'period': 'error',
            'totalMtdUsd': 0, 'total30dUsd': 0,
            'projectedMonthUsd': 0, 'lastMonthUsd': 0, 'momChangePct': 0,
            'byResourceGroup': {}, 'dailyBreakdown': [],
            'byService': [], 'byResource': [],
            'synced': datetime.utcnow().isoformat(),
            'live': False, 'error': str(e),
        })



@app.route('/api/costs')
def get_costs():
    """Alias — so both /api/cost and /api/costs work"""
    return get_cost()


# ── GET /api/advisor ───────────────────────────────────────────────────────────
# Returns Azure Advisor cost recommendations
@app.route('/api/advisor')
def get_advisor():
    BILLING_ACCOUNT = os.environ.get(
        'AZURE_BILLING_ACCOUNT',
        '08939987-cf28-58ff-ed6d-3b121f622150:2b26c114-8654-4813-8f69-40498d10a78d_2019-05-31'
    )
    try:
        from azure.mgmt.advisor import AdvisorManagementClient
        cred, sub_id = _azure_credential()
        advisor = AdvisorManagementClient(cred, sub_id)
        recs = list(advisor.recommendations.list())
        result = []
        for r in recs:
            props = r.properties if hasattr(r, 'properties') else {}
            savings = None
            try:
                ext = getattr(props, 'extended_properties', {}) or {}
                savings = float(ext.get('annualSavingsAmount', 0)) if ext else None
            except Exception:
                pass
            result.append({
                'id':           r.id or '',
                'title':        getattr(props, 'short_description', {}).get('solution', '') if hasattr(getattr(props, 'short_description', None), 'get') else str(getattr(props, 'short_description', '')),
                'description':  getattr(props, 'short_description', {}).get('problem', '') if hasattr(getattr(props, 'short_description', None), 'get') else '',
                'impact':       getattr(r, 'impact', 'Medium'),
                'category':     getattr(r, 'category', 'Cost'),
                'resource':     (r.id or '').split('/')[-3] if r.id and '/' in r.id else '—',
                'annualSavingsUsd': savings,
                'updatedAt':    str(getattr(props, 'last_updated', '')),
            })
        result_cost = [x for x in result if str(x.get('category','')).lower() == 'cost']
        return jsonify({
            'recommendations': result_cost or result,
            'total': len(result),
            'costCount': len(result_cost),
            'synced': datetime.utcnow().isoformat(),
            'live': True,
        })
    except ImportError:
        return jsonify({'live': False, 'error': 'azure-mgmt-advisor not installed',
                        'recommendations': [], 'total': 0, 'costCount': 0})
    except Exception as e:
        return jsonify({'live': False, 'error': str(e),
                        'recommendations': [], 'total': 0, 'costCount': 0})


# ── POST /api/vms/<vm_id>/request-state ──────────────────────────────────────
@app.route('/api/vms/<vm_id>/request-state', methods=['POST'])
def request_vm_state(vm_id):
    try:
        body      = request.get_json()
        new_state = body.get('state', '')
        if new_state not in {'running', 'snoozed', 'destroyed'}:
            return jsonify({'error': f'Invalid state "{new_state}"'}), 400

        try:
            with open(PENDING_LOG) as f:
                pending = json.load(f)
        except Exception:
            pending = []

        pending.append({
            'vm_id':        vm_id,
            'new_state':    new_state,
            'requested_at': datetime.utcnow().isoformat(),
            'status':       'pending',
        })
        os.makedirs(os.path.dirname(PENDING_LOG), exist_ok=True)
        with open(PENDING_LOG, 'w') as f:
            json.dump(pending, f, indent=2)

        return jsonify({
            'accepted':       True,
            'vm':             vm_id,
            'requestedState': new_state,
            'message':        f'Request logged. Admin will trigger pipeline via git push.',
            'adminAction':    'pending',
        })
    except Exception as e:
        return jsonify({'error': str(e), 'accepted': False}), 500


# ── GET /api/vms/pending-requests ────────────────────────────────────────────
@app.route('/api/vms/pending-requests')
def get_pending_requests():
    try:
        with open(PENDING_LOG) as f:
            return jsonify(json.load(f))
    except Exception:
        return jsonify([])



# ── GET /api/monitor/logs ─────────────────────────────────────────────────────
# Returns Azure Activity Log entries for the resource group
@app.route('/api/monitor/logs')
def get_monitor_logs():
    try:
        from azure.mgmt.monitor import MonitorManagementClient
        cred, sub_id = _azure_credential()
        client = MonitorManagementClient(cred, sub_id)
        rg = os.environ.get('AZURE_RESOURCE_GROUP', 'rg-dashboard-demo')
        now   = datetime.utcnow()
        start = (now - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%SZ')
        end   = now.strftime('%Y-%m-%dT%H:%M:%SZ')
        filter_str = f"eventTimestamp ge '{start}' and eventTimestamp le '{end}' and resourceGroupName eq '{rg}'"
        events = list(client.activity_logs.list(filter=filter_str, select='eventTimestamp,level,operationName,resourceId,caller,status'))
        entries = []
        for e in events[:50]:
            entries.append({
                'timestamp':  e.event_timestamp.strftime('%Y-%m-%d %H:%M') if e.event_timestamp else '—',
                'level':      e.level.value if e.level else 'Information',
                'operation':  e.operation_name.localized_value if e.operation_name else '—',
                'resource':   e.resource_id.split('/')[-1] if e.resource_id else '—',
                'caller':     e.caller or '—',
                'status':     e.status.localized_value if e.status else '—',
            })
        return jsonify({'entries': entries, 'synced': datetime.utcnow().isoformat(), 'live': True})
    except ImportError:
        return jsonify({'entries': [], 'live': False, 'error': 'azure-mgmt-monitor not installed'})
    except Exception as e:
        return jsonify({'entries': [], 'live': False, 'error': str(e)})



# ── POST /api/admin/update-request ───────────────────────────────────────────
# Lightweight status update — accept or close a request without git push.
# Admin manually makes Git changes and closes the request here when done.
@app.route('/api/admin/update-request', methods=['POST'])
def admin_update_request():
    try:
        body         = request.get_json()
        vm_id        = body.get('vm_id', '')
        new_state    = body.get('new_state', '')
        requested_at = body.get('requested_at', '')
        new_status   = body.get('status', '')          # 'accepted' or 'actioned'
        admin_note   = body.get('admin_note', '')

        if new_status not in {'accepted', 'actioned'}:
            return jsonify({'ok': False, 'error': f'Invalid status "{new_status}"'}), 400

        try:
            with open(PENDING_LOG) as f:
                pending = json.load(f)
        except Exception:
            pending = []

        updated = False
        for r in pending:
            if r['vm_id'] == vm_id and r.get('requested_at') == requested_at:
                r['status'] = new_status
                if admin_note:
                    r['admin_note'] = admin_note
                if new_status == 'actioned':
                    r['actioned_at'] = datetime.utcnow().isoformat()
                updated = True
                break

        if not updated:
            # Fallback — match by vm_id + new_state if requested_at not found
            for r in pending:
                if r['vm_id'] == vm_id and r['new_state'] == new_state and r['status'] != 'actioned':
                    r['status'] = new_status
                    if admin_note:
                        r['admin_note'] = admin_note
                    if new_status == 'actioned':
                        r['actioned_at'] = datetime.utcnow().isoformat()
                    updated = True
                    break

        os.makedirs(os.path.dirname(PENDING_LOG), exist_ok=True)
        with open(PENDING_LOG, 'w') as f:
            json.dump(pending, f, indent=2)

        return jsonify({
            'ok':      True,
            'status':  new_status,
            'message': f'{vm_id} request {new_status}.',
        })
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


# ── POST /api/admin/action-request ───────────────────────────────────────────
# Admin reviews a pending request and triggers the pipeline.
@app.route('/api/admin/action-request', methods=['POST'])
def admin_action_request():
    import re, subprocess
    try:
        body      = request.get_json()
        vm_id     = body.get('vm_id', '')
        new_state = body.get('new_state', '')

        if new_state not in {'running', 'snoozed', 'destroyed'}:
            return jsonify({'ok': False, 'error': f'Invalid state'}), 400

        INVENTORY_YML_PATH = os.path.join(BASE_DIR, 'inventory.yml')

        # 1. Patch inventory.yml if it exists
        try:
            with open(INVENTORY_YML_PATH, 'r') as f:
                yml = f.read()
            # Find the VM block and update state + enabled
            pattern = r'(- name: ' + re.escape(vm_id) + r'\b.*?)(?=\n  - name:|\Z)'
            match = re.search(pattern, yml, re.DOTALL)
            if match:
                block = match.group(1)
                block = re.sub(r'(state:\s*)\S+', r'\g<1>' + new_state, block)
                block = re.sub(r'(enabled:\s*)\S+',
                    r'\g<1>' + ('false' if new_state == 'destroyed' else 'true'), block)
                patched = yml[:match.start()] + block + yml[match.end():]
                with open(INVENTORY_YML_PATH, 'w') as f:
                    f.write(patched)
        except Exception:
            pass

        # 2. Update inventory.json desired_state
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

        # 3. Mark request as actioned in pending log
        try:
            with open(PENDING_LOG) as f:
                pending = json.load(f)
            for r in pending:
                if r['vm_id'] == vm_id and r['new_state'] == new_state and r.get('status') == 'pending':
                    r['status'] = 'actioned'
                    r['actioned_at'] = datetime.utcnow().isoformat()
                    break
            with open(PENDING_LOG, 'w') as f:
                json.dump(pending, f, indent=2)
        except Exception:
            pass

        # 4. Git commit + push → triggers GitHub Actions pipeline
        files = [f for f in [INVENTORY_JSON, INVENTORY_YML_PATH, PENDING_LOG] if os.path.exists(f)]
        commit_msg = f'admin: set {vm_id} to {new_state} via IM dashboard'
        subprocess.run(['git', 'add'] + files, check=True, cwd=BASE_DIR, capture_output=True)
        subprocess.run(['git', 'commit', '-m', commit_msg], check=True, cwd=BASE_DIR, capture_output=True)
        subprocess.run(['git', 'push'], check=True, cwd=BASE_DIR, capture_output=True)

        return jsonify({'ok': True, 'message': f'{vm_id} set to {new_state}. Pipeline triggered.'})

    except subprocess.CalledProcessError as e:
        err = e.stderr.decode() if e.stderr else str(e)
        return jsonify({'ok': False, 'error': f'Git error: {err}'}), 500
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


# ── GET /api/pricing ──────────────────────────────────────────────────────────
# Proxy for Azure Retail Prices API — avoids CORS when called from React frontend
# Public API, no auth required. Passes through filter/top params.
@app.route('/api/pricing')
def get_pricing():
    try:
        # Use query_string directly to avoid Flask mangling $filter/$top keys
        qs       = request.query_string.decode('utf-8')
        url      = f'https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&{qs}'
        headers  = {'Accept': 'application/json'}
        r        = requests.get(url, headers=headers, timeout=20)
        r.raise_for_status()
        data     = r.json()
        items    = data.get('Items', data.get('items', []))
        return jsonify({'Items': items, 'Count': len(items), 'NextPageLink': data.get('NextPageLink')})
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Azure Prices API timed out', 'Items': []}), 504
    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'Azure Prices API error: {e.response.status_code}', 'Items': []}), 502
    except Exception as e:
        return jsonify({'error': str(e), 'Items': []}), 500


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=80, debug=False)