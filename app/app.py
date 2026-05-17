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
            'costHrUsd': round(co.get('hourly_inr', 0) / 84.0, 4),
            'monthlyUsd': round(co.get('monthly_inr', 0) / 84.0, 2),
            'optimisedMonthlyUsd': round(co.get('optimized_monthly_inr', 0) / 84.0, 2),
            'savingsUsd': round(co.get('savings_inr', 0) / 84.0, 2),
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
                'costHrUsd': round(co.get('hourly_inr', 0) / 84.0, 4),
                'monthlyUsd': round(co.get('monthly_inr', 0) / 84.0, 2),
                'optimisedMonthlyUsd': round(co.get('optimized_monthly_inr', 0) / 84.0, 2),
                'savingsUsd': round(co.get('savings_inr', 0) / 84.0, 2),
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


# ── GET /api/cost ──────────────────────────────────────────────────────────────
# Returns real Azure cost data in USD: total MTD, daily breakdown, by service
@app.route('/api/cost')
def get_cost():
    try:
        from azure.mgmt.costmanagement import CostManagementClient
        from azure.mgmt.costmanagement.models import (
            QueryDefinition, QueryTimePeriod, QueryDataset,
            QueryAggregation, QueryGrouping)

        cred, sub_id = _azure_credential()
        client = CostManagementClient(cred)
        now    = datetime.utcnow()
        start  = now.replace(day=1).strftime('%Y-%m-%d')
        end    = now.strftime('%Y-%m-%d')
        scope  = f'/subscriptions/{sub_id}'

        # ── Total MTD by resource group ───────────────────────────────────────
        q_total = QueryDefinition(
            type='ActualCost', timeframe='Custom',
            time_period=QueryTimePeriod(from_property=start, to=end),
            dataset=QueryDataset(
                granularity='None',
                aggregation={'totalCost': QueryAggregation(name='Cost', function='Sum')},
                grouping=[QueryGrouping(type='Dimension', name='ResourceGroupName')]),
        )
        res_total = client.query.usage(scope, q_total)
        by_rg     = {}
        total_usd = 0.0
        for row in (res_total.rows or []):
            cost    = float(row[0])
            rg_name = str(row[1]) if len(row) > 1 else 'unknown'
            by_rg[rg_name] = round(cost, 4)
            total_usd += cost
        total_usd = round(total_usd, 4)

        # ── Daily breakdown last 30 days ──────────────────────────────────────
        start_30 = (now - timedelta(days=29)).strftime('%Y-%m-%d')
        q_daily  = QueryDefinition(
            type='ActualCost', timeframe='Custom',
            time_period=QueryTimePeriod(from_property=start_30, to=end),
            dataset=QueryDataset(
                granularity='Daily',
                aggregation={'totalCost': QueryAggregation(name='Cost', function='Sum')}),
        )
        res_daily = client.query.usage(scope, q_daily)
        daily = []
        for row in (res_daily.rows or []):
            cost     = float(row[0])
            date_val = str(row[1])
            if len(date_val) == 8:
                date_val = f'{date_val[:4]}-{date_val[4:6]}-{date_val[6:]}'
            daily.append({'date': date_val, 'costUsd': round(cost, 4)})
        daily.sort(key=lambda x: x['date'])

        # ── Cost by service ───────────────────────────────────────────────────
        q_service = QueryDefinition(
            type='ActualCost', timeframe='Custom',
            time_period=QueryTimePeriod(from_property=start, to=end),
            dataset=QueryDataset(
                granularity='None',
                aggregation={'totalCost': QueryAggregation(name='Cost', function='Sum')},
                grouping=[QueryGrouping(type='Dimension', name='ServiceName')]),
        )
        res_service = client.query.usage(scope, q_service)
        by_service  = []
        for row in (res_service.rows or []):
            cost = float(row[0])
            svc  = str(row[1]) if len(row) > 1 else 'Other'
            if cost > 0.0001:
                by_service.append({'service': svc, 'costUsd': round(cost, 4)})
        by_service.sort(key=lambda x: x['costUsd'], reverse=True)

        # ── Last month total ──────────────────────────────────────────────────
        first_this      = now.replace(day=1)
        lm_end          = (first_this - timedelta(days=1)).strftime('%Y-%m-%d')
        lm_start        = (first_this - timedelta(days=1)).replace(day=1).strftime('%Y-%m-%d')
        q_last          = QueryDefinition(
            type='ActualCost', timeframe='Custom',
            time_period=QueryTimePeriod(from_property=lm_start, to=lm_end),
            dataset=QueryDataset(
                granularity='None',
                aggregation={'totalCost': QueryAggregation(name='Cost', function='Sum')}),
        )
        res_last      = client.query.usage(scope, q_last)
        last_month_usd = round(sum(float(r[0]) for r in (res_last.rows or [])), 4)

        # ── Project full-month spend ──────────────────────────────────────────
        day_of_month   = max(now.day, 1)
        import calendar
        days_in_month  = calendar.monthrange(now.year, now.month)[1]
        projected_usd  = round((total_usd / day_of_month) * days_in_month, 4)
        mom_change_pct = round(((projected_usd - last_month_usd) / max(last_month_usd, 0.01)) * 100, 1) if last_month_usd > 0 else 0

        return jsonify({
            'currency':         'USD',
            'period':           f'{start} to {end}',
            'totalMtdUsd':      total_usd,
            'projectedMonthUsd': projected_usd,
            'lastMonthUsd':     last_month_usd,
            'momChangePct':     mom_change_pct,
            'byResourceGroup':  by_rg,
            'dailyBreakdown':   daily,
            'byService':        by_service[:10],
            'synced':           datetime.utcnow().isoformat(),
            'live':             True,
        })

    except ImportError:
        return jsonify({'error': 'azure-mgmt-costmanagement not installed', 'live': False}), 503

    except Exception as e:
        # Graceful fallback — still returns valid shape so frontend renders
        try:
            inv = _load_inv()
            cs  = inv.get('total_cost_summary', {})
            return jsonify({
                'currency':          'USD',
                'period':            'fallback',
                'totalMtdUsd':       round(cs.get('monthly_optimized_inr', 0) / 84.0, 2),
                'projectedMonthUsd': round(cs.get('monthly_unoptimized_inr', 0) / 84.0, 2),
                'lastMonthUsd':      0,
                'momChangePct':      0,
                'byResourceGroup':   {},
                'dailyBreakdown':    [],
                'byService':         [],
                'synced':            datetime.utcnow().isoformat(),
                'live':              False,
                'error':             str(e),
            })
        except Exception:
            return jsonify({'error': str(e), 'live': False}), 500


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

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=80, debug=False)