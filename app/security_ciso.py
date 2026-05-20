"""
security_ciso.py
────────────────
Azure-backed helpers for:
  • get_public_ip_exposure(vm_names, rg, cred, sub_id)
  • get_certificate_status(vm_names, rg, cred, sub_id)
  • get_vulnerabilities(vm_names, rg, cred, sub_id)

Each returns a dict keyed by VM name:
  { "vm-running": [ {...}, {...} ], "vm-snoozed": [ ... ] }

This matches the shape the React useSecurityApi() hook expects.
"""

import os
import ssl
import socket
from datetime import datetime, timezone


# ── Shared Azure helpers ──────────────────────────────────────────────────────

def _rg():
    return os.environ.get('AZURE_RESOURCE_GROUP', 'rg-dashboard-demo')


def _now():
    return datetime.now(timezone.utc)


def _days_left(expiry_dt):
    """Return integer days until expiry (negative = already expired)."""
    if expiry_dt is None:
        return None
    delta = expiry_dt.replace(tzinfo=timezone.utc) - _now()
    return int(delta.total_seconds() // 86400)


def _cert_status(days):
    if days is None:
        return 'Unknown'
    if days < 0:
        return 'Expired'
    if days <= 90:
        return 'Expiring Soon'
    return 'Valid'


# ── 1. Public IP Exposure ─────────────────────────────────────────────────────

def get_public_ip_exposure(vm_names, cred, sub_id):
    """
    For each VM, look up its NIC → attached NSG rules + public IP.
    Returns per-VM list of port-exposure records:
      { ip, port, protocol, exposure, risk, justification }
    """
    from azure.mgmt.compute import ComputeManagementClient
    from azure.mgmt.network import NetworkManagementClient

    rg      = _rg()
    compute = ComputeManagementClient(cred, sub_id)
    network = NetworkManagementClient(cred, sub_id)
    result  = {name: [] for name in vm_names}

    for vm_name in vm_names:
        try:
            vm = compute.virtual_machines.get(rg, vm_name)
        except Exception:
            result[vm_name] = [{'error': f'VM {vm_name} not found in resource group {rg}'}]
            continue

        # Collect NICs attached to this VM
        for nic_ref in (vm.network_profile.network_interfaces or []):
            nic_name = nic_ref.id.split('/')[-1]
            try:
                nic = network.network_interfaces.get(rg, nic_name)
            except Exception:
                continue

            # Resolve public IP (if any)
            public_ip_addr = None
            for ipc in (nic.ip_configurations or []):
                if ipc.public_ip_address:
                    pip_name = ipc.public_ip_address.id.split('/')[-1]
                    try:
                        pip = network.public_ip_addresses.get(rg, pip_name)
                        public_ip_addr = pip.ip_address
                    except Exception:
                        pass

            private_ip = (nic.ip_configurations[0].private_ip_address
                          if nic.ip_configurations else None)

            # Walk NSG rules to find inbound allow rules
            nsg_rules = []
            if nic.network_security_group:
                nsg_name = nic.network_security_group.id.split('/')[-1]
                try:
                    nsg = network.network_security_groups.get(rg, nsg_name)
                    nsg_rules = list(nsg.security_rules or []) + \
                                list(nsg.default_security_rules or [])
                except Exception:
                    pass

            inbound_allow = [
                r for r in nsg_rules
                if (getattr(r, 'direction', '') or '').lower() == 'inbound'
                and (getattr(r, 'access', '') or '').lower() == 'allow'
            ]

            if not inbound_allow and not public_ip_addr:
                # No public IP, no explicit allow rules → show private-only summary
                result[vm_name].append({
                    'ip':            private_ip or '(private)',
                    'port':          None,
                    'protocol':      '—',
                    'exposure':      'Private',
                    'risk':          'Low',
                    'justification': 'No public IP assigned; no inbound NSG allow rules.',
                })
                continue

            for rule in inbound_allow:
                port_range   = getattr(rule, 'destination_port_range', '*') or '*'
                src_range    = getattr(rule, 'source_address_prefix', '*') or '*'
                protocol     = (getattr(rule, 'protocol', 'TCP') or 'TCP').upper()
                is_public_ip = public_ip_addr is not None
                is_open_net  = src_range in ('*', '0.0.0.0/0', 'Internet', 'Any')

                exposure = 'Public' if (is_public_ip and is_open_net) else \
                           'Public' if is_public_ip else 'Private'

                # Risk heuristic
                if exposure == 'Public' and port_range in ('22', '3389'):
                    risk = 'Critical'
                    note = f'{"SSH" if port_range == "22" else "RDP"} open to {src_range} — restrict via NSG.'
                elif exposure == 'Public' and src_range in ('*', '0.0.0.0/0', 'Internet'):
                    risk = 'High'
                    note = f'Port {port_range} publicly reachable from {src_range}.'
                elif exposure == 'Public':
                    risk = 'Medium'
                    note = f'Port {port_range} accessible from {src_range}.'
                else:
                    risk = 'Low'
                    note = f'Port {port_range} restricted to VNet / specific range ({src_range}).'

                # Try to parse a single integer port; leave as range string otherwise
                try:
                    port_val = int(port_range)
                except (ValueError, TypeError):
                    port_val = port_range  # e.g. "80-443" or "*"

                result[vm_name].append({
                    'ip':            public_ip_addr or private_ip or '—',
                    'port':          port_val,
                    'protocol':      protocol if protocol != 'All' else 'TCP/UDP',
                    'exposure':      exposure,
                    'risk':          risk,
                    'justification': note,
                    'nsg_rule':      rule.name,
                })

        if not result[vm_name]:
            result[vm_name].append({
                'ip':            '—',
                'port':          None,
                'protocol':      '—',
                'exposure':      'None',
                'risk':          'Info',
                'justification': 'VM has no NICs or is deprovisioned.',
            })

    return result


# ── 2. Certificate Monitoring ─────────────────────────────────────────────────

def get_certificate_status(vm_names, cred, sub_id):
    """
    Two sources:
      a) Azure Key Vault certificates (if a vault is linked in env AZURE_KEYVAULT_URL)
      b) Live TLS probe of any public IP on port 443 associated with each VM

    Returns per-VM list:
      { domain, issuer, expiry, days_left, status }
    """
    from azure.mgmt.compute import ComputeManagementClient
    from azure.mgmt.network import NetworkManagementClient

    rg      = _rg()
    compute = ComputeManagementClient(cred, sub_id)
    network = NetworkManagementClient(cred, sub_id)
    result  = {name: [] for name in vm_names}

    # ── a) Key Vault certificates ─────────────────────────────────────────────
    vault_url = os.environ.get('AZURE_KEYVAULT_URL')
    if vault_url:
        try:
            from azure.keyvault.certificates import CertificateClient
            kv = CertificateClient(vault_url=vault_url, credential=cred)
            for cert_props in kv.list_properties_of_certificates():
                # Tag certs to VMs via a 'vm' tag on the KV certificate
                tags    = cert_props.tags or {}
                vm_tag  = tags.get('vm') or tags.get('VM')
                if vm_tag and vm_tag in result:
                    full   = kv.get_certificate(cert_props.name)
                    expiry = full.properties.expires_on
                    days   = _days_left(expiry)
                    result[vm_tag].append({
                        'domain':    tags.get('domain', cert_props.name),
                        'issuer':    full.policy.issuer_name if full.policy else 'Key Vault',
                        'expiry':    expiry.strftime('%Y-%m-%d') if expiry else '—',
                        'days_left': days,
                        'status':    _cert_status(days),
                        'source':    'Azure Key Vault',
                    })
        except Exception:
            pass  # KV unavailable — fall through to TLS probe

    # ── b) Live TLS probe on public IPs ──────────────────────────────────────
    for vm_name in vm_names:
        # Skip if KV already populated this VM
        if result[vm_name]:
            continue
        try:
            vm = compute.virtual_machines.get(rg, vm_name)
        except Exception:
            continue
        for nic_ref in (vm.network_profile.network_interfaces or []):
            nic_name = nic_ref.id.split('/')[-1]
            try:
                nic = network.network_interfaces.get(rg, nic_name)
            except Exception:
                continue
            for ipc in (nic.ip_configurations or []):
                if not ipc.public_ip_address:
                    continue
                pip_name = ipc.public_ip_address.id.split('/')[-1]
                try:
                    pip = network.public_ip_addresses.get(rg, pip_name)
                    ip  = pip.ip_address
                    fqdn = (pip.dns_settings.fqdn
                            if pip.dns_settings and pip.dns_settings.fqdn
                            else ip)
                    if not ip:
                        continue
                    # TLS probe
                    ctx = ssl.create_default_context()
                    ctx.check_hostname = False
                    ctx.verify_mode    = ssl.CERT_NONE
                    with socket.create_connection((ip, 443), timeout=5) as sock:
                        with ctx.wrap_socket(sock, server_hostname=fqdn) as ssock:
                            cert   = ssock.getpeercert()
                            issuer = dict(x[0] for x in cert.get('issuer', []))
                            expiry_str = cert.get('notAfter', '')
                            expiry_dt  = None
                            if expiry_str:
                                try:
                                    expiry_dt = datetime.strptime(
                                        expiry_str, '%b %d %H:%M:%S %Y %Z'
                                    ).replace(tzinfo=timezone.utc)
                                except Exception:
                                    pass
                            days = _days_left(expiry_dt)
                            result[vm_name].append({
                                'domain':    fqdn,
                                'issuer':    issuer.get('organizationName',
                                             issuer.get('commonName', 'Unknown')),
                                'expiry':    expiry_dt.strftime('%Y-%m-%d') if expiry_dt else '—',
                                'days_left': days,
                                'status':    _cert_status(days),
                                'source':    'TLS probe',
                            })
                except (socket.timeout, ConnectionRefusedError, OSError):
                    # Port 443 not open — not necessarily an issue
                    result[vm_name].append({
                        'domain':    fqdn if 'fqdn' in dir() else ip,
                        'issuer':    '—',
                        'expiry':    '—',
                        'days_left': None,
                        'status':    'No HTTPS',
                        'source':    'TLS probe',
                    })
                except Exception:
                    pass

        if not result[vm_name]:
            result[vm_name].append({
                'domain':    '—',
                'issuer':    '—',
                'expiry':    '—',
                'days_left': None,
                'status':    'No Public IP',
                'source':    '—',
            })

    return result


# ── 3. Vulnerabilities ────────────────────────────────────────────────────────

def get_vulnerabilities(vm_names, cred, sub_id):
    """
    Pulls vulnerability assessments from Microsoft Defender for Cloud
    (azure.mgmt.security — Security Center assessments API).

    Returns per-VM list:
      { id, component, severity, cvss, description, status, detected }
    """
    result = {name: [] for name in vm_names}

    try:
        from azure.mgmt.security import SecurityCenter
    except ImportError:
        for name in vm_names:
            result[name] = [{'error': 'azure-mgmt-security not installed. '
                                      'Run: pip install azure-mgmt-security'}]
        return result

    rg     = _rg()
    sc     = SecurityCenter(cred, sub_id, asc_location='eastus')

    # Map partial resource IDs back to VM names (lower-cased for matching)
    vm_name_lower = {n.lower(): n for n in vm_names}

    try:
        assessments = list(sc.assessments.list(
            f'/subscriptions/{sub_id}/resourceGroups/{rg}'
        ))
    except Exception as e:
        for name in vm_names:
            result[name] = [{'error': f'Defender for Cloud API error: {str(e)}'}]
        return result

    for a in assessments:
        props    = a.properties if hasattr(a, 'properties') else {}
        status   = getattr(props, 'status', None)
        # Only surface unhealthy / degraded findings
        status_code = (getattr(status, 'code', '') or '').lower()
        if status_code not in ('unhealthy', 'notapplicable'):
            continue

        resource_id  = (a.id or '').lower()
        # Try to match this assessment to one of our VMs
        matched_vm = None
        for key, original in vm_name_lower.items():
            if f'/{key}/' in resource_id or resource_id.endswith(f'/{key}'):
                matched_vm = original
                break
        if not matched_vm:
            continue

        display_name  = getattr(props, 'display_name', '') or a.name or 'Unknown'
        description   = getattr(props, 'description', '') or ''
        remediation   = getattr(props, 'remediation_description', '') or ''
        severity_raw  = (getattr(getattr(props, 'metadata', None), 'severity', 'Medium')
                         or 'Medium')
        severity_map  = {'high': 'High', 'medium': 'Medium', 'low': 'Low'}
        severity      = severity_map.get(severity_raw.lower(), severity_raw.capitalize())

        # Defender doesn't return CVE IDs directly — use assessment name as ID
        # If the title contains a CVE pattern, extract it
        import re
        cve_match = re.search(r'CVE-\d{4}-\d+', display_name + description)
        cve_id    = cve_match.group(0) if cve_match else a.name

        # CVSS — Defender returns it inside additionalData sometimes
        cvss = None
        try:
            add_data = getattr(props, 'additional_data', {}) or {}
            cvss = float(add_data.get('cvssV3', add_data.get('cvss', 0)) or 0) or None
        except Exception:
            pass

        # Map Defender severity → approximate CVSS if not present
        if cvss is None:
            cvss = {'Critical': 9.5, 'High': 7.5, 'Medium': 5.5, 'Low': 3.0}.get(severity, 5.0)

        status_map = {'unhealthy': 'Open', 'notapplicable': 'Info'}
        finding_status = status_map.get(status_code, 'Open')

        time_generated = getattr(status, 'first_evaluation_date', None)
        detected = (time_generated.strftime('%Y-%m-%d')
                    if time_generated and hasattr(time_generated, 'strftime')
                    else _now().strftime('%Y-%m-%d'))

        result[matched_vm].append({
            'id':          cve_id,
            'component':   display_name,
            'severity':    severity,
            'cvss':        round(cvss, 1),
            'description': (description or remediation)[:200],
            'status':      finding_status,
            'detected':    detected,
        })

    # Sort each VM's findings by CVSS descending
    for name in vm_names:
        result[name].sort(key=lambda x: x.get('cvss', 0) if isinstance(x.get('cvss'), float) else 0,
                          reverse=True)

    return result