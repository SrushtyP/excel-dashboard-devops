variable "subscription_id" {}
variable "client_id" {}
variable "client_secret" {}
variable "tenant_id" {}
variable "admin_password" {}

variable "resource_group_name" {
  default = "rg-dashboard-demo"
}

variable "location" {
  default = "Central US"
}

variable "admin_username" {
  default = "azureuser"
}

# Change this if capacity issues occur — no need to touch main.tf
variable "vm_size" {
  default = "Standard_D2s_v3"
}

# Set to true to provision vm-destroyed, false to destroy it
variable "create_vm_destroyed" {
  type    = bool
  default = false
}
