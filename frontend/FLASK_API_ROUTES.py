# ─────────────────────────────────────────────────────────────────────────────
# ADD THESE ROUTES TO YOUR EXISTING app/app.py
# They wire the React frontend to live Azure and GitHub data.
# ─────────────────────────────────────────────────────────────────────────────

import os, json, requests
from flask import jsonify, request
from azure.mgmt.compute import ComputeManagementClient
from azure.identity import ClientSecretCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.costmanagement.models import QueryDefinition, QueryTimePeriod, QueryDataset, QueryAggregation, QueryGrouping
from datetime import datetime, timedelta

# ── Azure credential (reads from azure_config.json or env vars) ──────────────
def _azure_cred():
    try:
        with open('../inventory/azure_config.json') as f:
            cfg = json.load(f)
        return ClientSecretCredential(
            tenant_id=cfg['tenant_id'],
            client_id=cfg['client_id'],
            client_secret=cfg['client_secret'],
        ), cfg['subscription_id']
    except Exception:
        # Fallback to env vars
        return ClientSecretCredential(
            tenant_id=os.environ['AZURE_TENANT_ID'],
            client_id=os.environ['AZURE_CLIENT_ID'],
            client_secret=os.environ['AZURE_CLIENT_SECRET'],
        ), os.environ['AZURE_SUBSCRIPTION_ID']


# ── /api/vms  ─────────────────────────────────────────────────────────────────
# Returns live VM power states from Azure
@app.route('/api/vms')
def get_vms():
    try:
        cred, sub_id = _azure_cred()
        compute = ComputeManagementClient(cred, sub_id)

        # Load inventory.json for metadata (alias, contact etc.)
        with open('../inventory/inventory.json') as f:
            inv = json.load(f)
        inv_map = {v['id']: v for v in inv.get('vms', [])}

        result = []
        rg = 'excel-dashboard-rg'  # adjust to your resource group name
        for vm in compute.virtual_machines.list(rg):
            iv = compute.virtual_machines.instance_view(rg, vm.name)
            # Power state is the last status
            power = 'unknown'
            for s in iv.statuses:
                if s.code.startswith('PowerState/'):
                    power = s.code.replace('PowerState/', '')

            # Map Azure power state → our state vocabulary
            state_map = {
                'running':      'running',
                'deallocated':  'destroyed',
                'deallocating': 'destroyed',
                'stopped':      'snoozed',
                'starting':     'running',
                'stopping':     'snoozed',
            }
            our_state = state_map.get(power, 'offline')

            meta = inv_map.get(vm.name, {})
            result.append({
                'id':          vm.name,
                'alias':       meta.get('alias', vm.name),
                'purpose':     meta.get('business_need', ''),
                'state':       our_state,
                'azureState':  power,
                'cpu':         meta.get('specs', {}).get('cpu', 2),
                'memGb':       meta.get('specs', {}).get('memory_gb', 8),
                'diskGb':      meta.get('specs', {}).get('disk_gb', 30),
                'size':        vm.hardware_profile.vm_size if vm.hardware_profile else '',
                'costHrInr':   meta.get('cost', {}).get('hourly_inr', 0),
                'monthlyInr':  meta.get('cost', {}).get('monthly_inr', 0),
                'optimisedMonthlyInr': meta.get('cost', {}).get('optimized_monthly_inr', 0),
                'savingsInr':  meta.get('cost', {}).get('savings_inr', 0),
                'contact':     meta.get('contact', ''),
                'unit':        meta.get('business_unit', ''),
                'environment': meta.get('environment', ''),
                'priority':    meta.get('priority', ''),
                'snooze':      None,
                'businessNeed': meta.get('business_need', ''),
                'uptime':      meta.get('uptime', '—'),
            })
        return jsonify({'vms': result, 'synced': datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({'error': str(e), 'vms': []}), 500


# ── /api/pipeline/runs  ───────────────────────────────────────────────────────
# Returns live GitHub Actions workflow runs
@app.route('/api/pipeline/runs')
def get_pipeline_runs():
    try:
        token  = os.environ.get('GITHUB_TOKEN')
        owner  = os.environ.get('GITHUB_OWNER', 'srushty-naik')   # your GH username
        repo   = os.environ.get('GITHUB_REPO',  'excel-dashboard-devops')
        wf     = 'deploy.yml'

        headers = {'Authorization': f'token {token}', 'Accept': 'application/vnd.github+json'}
        runs_url = f'https://api.github.com/repos/{owner}/{repo}/actions/workflows/{wf}/runs?per_page=10'
        r = requests.get(runs_url, headers=headers, timeout=10)
        r.raise_for_status()
        raw = r.json().get('workflow_runs', [])

        result = []
        for run in raw:
            # Fetch jobs for this run
            jobs_url = f'https://api.github.com/repos/{owner}/{repo}/actions/runs/{run["id"]}/jobs'
            jr = requests.get(jobs_url, headers=headers, timeout=10)
            jobs_raw = jr.json().get('jobs', []) if jr.ok else []

            jobs = []
            for j in jobs_raw:
                jobs.append({
                    'name':     j['name'],
                    'status':   j['conclusion'] or j['status'],   # success/failure/in_progress
                    'duration': _dur(j.get('started_at'), j.get('completed_at')),
                    'error':    None,
                })

            result.append({
                'id':          run['id'],
                'sha':         run['head_sha'][:7],
                'branch':      run['head_branch'],
                'commit':      run['display_title'],
                'actor':       run['actor']['login'],
                'status':      run['conclusion'] or 'running',
                'startedAt':   run['created_at'],
                'duration':    _dur(run.get('created_at'), run.get('updated_at')),
                'jobs':        jobs,
            })
        return jsonify({'runs': result, 'synced': datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({'error': str(e), 'runs': []}), 500


# ── /api/cost  ────────────────────────────────────────────────────────────────
# Returns live Azure cost data for the current month
@app.route('/api/cost')
def get_cost():
    try:
        cred, sub_id = _azure_cred()
        cost_client  = CostManagementClient(cred)

        scope = f'/subscriptions/{sub_id}'
        now   = datetime.utcnow()
        start = now.replace(day=1).date().isoformat()
        end   = now.date().isoformat()

        query = QueryDefinition(
            type='ActualCost',
            timeframe='Custom',
            time_period=QueryTimePeriod(from_property=start, to=end),
            dataset=QueryDataset(
                granularity='None',
                aggregation={'totalCost': QueryAggregation(name='Cost', function='Sum')},
                grouping=[QueryGrouping(type='Dimension', name='ResourceGroupName')],
            ),
        )
        result = cost_client.query.usage(scope, query)

        total_usd = sum(row[0] for row in (result.rows or []))
        inr_rate  = 84.0  # fallback; ideally fetch live rate
        total_inr = round(total_usd * inr_rate)

        return jsonify({
            'monthlyActualInr':  total_inr,
            'monthlyActualUsd':  round(total_usd, 2),
            'currencyRate':      inr_rate,
            'period':            f'{start} → {end}',
            'synced':            datetime.utcnow().isoformat(),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── /api/vms/<vm_id>/request-state  ──────────────────────────────────────────
# Accepts a state-change request, writes inventory.yml, pushes to GitHub
@app.route('/api/vms/<vm_id>/request-state', methods=['POST'])
def request_vm_state(vm_id):
    try:
        body       = request.get_json()
        new_state  = body.get('state')  # running | snoozed | destroyed
        allowed    = {'running', 'snoozed', 'destroyed'}
        if new_state not in allowed:
            return jsonify({'error': 'Invalid state'}), 400

        # 1. Read current inventory.yml
        with open('../inventory.yml') as f:
            content = f.read()

        # 2. Patch the state line for this VM using simple string replacement
        import re
        # Find the vm block and update its state field
        pattern = r'(- name: ' + re.escape(vm_id) + r'.*?state: )\w+'
        patched = re.sub(pattern, r'\g<1>' + new_state, content, flags=re.DOTALL)

        # Also update enabled flag: destroyed = false, else true
        enabled_val = 'false' if new_state == 'destroyed' else 'true'
        patched = re.sub(
            r'(- name: ' + re.escape(vm_id) + r'.*?enabled: )\w+',
            r'\g<1>' + enabled_val, patched, flags=re.DOTALL
        )

        # 3. Write back
        with open('../inventory.yml', 'w') as f:
            f.write(patched)

        # 4. Git commit + push to trigger GitHub Actions
        import subprocess
        subprocess.run(['git', 'add', '../inventory.yml'], check=True, cwd='/opt/dashboard-app')
        subprocess.run(
            ['git', 'commit', '-m', f'chore: set {vm_id} state → {new_state} via IM dashboard'],
            check=True, cwd='/opt/dashboard-app'
        )
        subprocess.run(['git', 'push'], check=True, cwd='/opt/dashboard-app')

        return jsonify({'accepted': True, 'vm': vm_id, 'requestedState': new_state})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Helper ────────────────────────────────────────────────────────────────────
def _dur(start, end):
    if not start or not end:
        return None
    try:
        fmt = '%Y-%m-%dT%H:%M:%SZ'
        s   = datetime.strptime(start, fmt)
        e   = datetime.strptime(end,   fmt)
        sec = int((e - s).total_seconds())
        if sec < 60: return f'{sec}s'
        return f'{sec//60}m {sec%60:02d}s'
    except Exception:
        return None
