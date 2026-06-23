variable "subscription_id" {}
variable "client_id" {}
variable "client_secret" {}
variable "tenant_id" {}
variable "admin_password" {}

variable "resource_group_name" {
  default = "rg-drishti-demo"
}

# Resource group location (does not affect VM placement)
variable "location" {
  default = "southafricanorth"
}

# Per-VM region assignments
variable "location_running" {
  default = "centralindia"
}

variable "location_snoozed" {
  default = "koreacentral"
}

variable "location_destroyed" {
  default = "southafricanorth"
}

variable "admin_username" {
  default = "azureuser"
}

variable "vm_size" {
  default = "Standard_B2ats_v2"
}

# Set to true to provision vm-destroyed, false to destroy it
variable "create_vm_destroyed" {
  type    = bool
  default = false
}
