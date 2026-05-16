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

variable "vm_name" {
  default = "vm-dashboard"
}

# Change this if capacity issues occur — no need to touch main.tf
variable "vm_size" {
  default = "Standard_D2s_v3"
}
