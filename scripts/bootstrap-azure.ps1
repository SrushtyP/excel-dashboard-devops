<#
  One-time bootstrap for a fresh Azure subscription.

  Creates what GitHub Actions needs BEFORE its first run (it cannot create these itself):
    1. A separate resource group + storage account + container for Terraform state
    2. A service principal (Contributor on the subscription) that the workflows log in as

  Everything else (VNets, VMs, IPs, ...) is created by Terraform from the pipeline.

  Usage (after `az login` with the NEW account and `az account set --subscription <id>`):
    ./scripts/bootstrap-azure.ps1
  Then add the printed values as GitHub repository secrets.
#>
param(
  [string]$Location        = "centralindia",
  [string]$StateRg         = "drishtidemo",
  [string]$SpName          = "sp-excel-dashboard-github"
)
$ErrorActionPreference = "Stop"

$acct = az account show | ConvertFrom-Json
Write-Host "Using subscription: $($acct.name) ($($acct.id)) as $($acct.user.name)" -ForegroundColor Cyan
if ((Read-Host "Continue? (y/N)") -ne "y") { exit 1 }

# Storage account names are global, lowercase, 3-24 chars -> add a random suffix
$suffix  = -join ((48..57) + (97..122) | Get-Random -Count 6 | ForEach-Object { [char]$_ })
$storage = "stexceldash$suffix"

# Resource group already exists (created manually); reuse it and its region
$Location = az group show -n $StateRg --query location -o tsv
az storage account create -n $storage -g $StateRg -l $Location --sku Standard_LRS `
  --min-tls-version TLS1_2 --allow-blob-public-access false -o none
$key = az storage account keys list -n $storage -g $StateRg --query "[0].value" -o tsv
az storage container create -n tfstate --account-name $storage --account-key $key -o none

$sp = az ad sp create-for-rbac --name $SpName --role Contributor `
  --scopes "/subscriptions/$($acct.id)" | ConvertFrom-Json

Write-Host "`nAdd these as GitHub repo secrets (Settings > Secrets and variables > Actions):`n" -ForegroundColor Green
"AZURE_SUBSCRIPTION_ID    = $($acct.id)"
"AZURE_TENANT_ID          = $($sp.tenant)"
"AZURE_CLIENT_ID          = $($sp.appId)"
"AZURE_CLIENT_SECRET      = $($sp.password)"
"TFSTATE_RESOURCE_GROUP   = $StateRg"
"TFSTATE_STORAGE_ACCOUNT  = $storage"
"AZURE_STORAGE_KEY        = $key"
Write-Host "`nAlso add manually: VM_PASSWORD (12+ chars, upper/lower/number/symbol) and PAT_TOKEN (GitHub PAT, 'repo' + 'workflow' scopes)." -ForegroundColor Yellow
Write-Host "Treat the output above as secret - don't paste it into chat or commit it."
