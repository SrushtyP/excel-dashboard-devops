from azure.identity import ClientSecretCredential
from azure.mgmt.authorization import AuthorizationManagementClient
import json, os

KNOWN_ROLES = {
    '8e3af657-a8ff-443c-a75c-2fe8c4bcb635': 'Owner',
    'b24988ac-6180-42a0-ab88-20f7382dd24c': 'Contributor',
    'acdd72a7-3385-48ef-bd42-f606fba81ae7': 'Reader',
}

RESOURCE_GROUP = 'rg-drishti-demo'

def get_auth_client():
    config_path = os.path.join(os.path.dirname(__file__), '../inventory/azure_config.json')
    with open(config_path) as f:
        c = json.load(f)
    cred = ClientSecretCredential(c['tenant_id'], c['client_id'], c['client_secret'])
    return AuthorizationManagementClient(cred, c['subscription_id'])

def get_assignments_for_vm(client, vm_name):
    assignments = client.role_assignments.list_for_resource(
        resource_group_name=RESOURCE_GROUP,
        resource_provider_namespace='Microsoft.Compute',
        resource_type='virtualMachines',
        resource_name=vm_name
    )
    results = []
    for r in assignments:
        role_id = r.role_definition_id.split('/')[-1]
        results.append({
            'principal_id':   r.principal_id,
            'principal_type': r.principal_type,
            'role_id':        role_id,
            'role_name':      KNOWN_ROLES.get(role_id, 'Unknown'),
            'is_owner':       role_id == '8e3af657-a8ff-443c-a75c-2fe8c4bcb635',
        })
    return results

def get_all_assignments(vm_names):
    client = get_auth_client()
    out = {}
    for name in vm_names:
        try:
            out[name] = get_assignments_for_vm(client, name)
        except Exception as e:
            out[name] = {'error': str(e)}
    return out