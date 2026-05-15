variable "subscription_id" {}
variable "client_id" {}
variable "client_secret" {}
variable "tenant_id" {}
variable "admin_password" {}

variable "resource_group_name" {
  default = "rg-dashboard-demo"
}

variable "location" {
  default = "East US"
}

variable "admin_username" {
  default = "azureuser"
}

variable "vm_name" {
  default = "vm-running"
}

# Set to false to destroy vm-destroyed resources
# Set to true to provision vm-destroyed
variable "create_vm_destroyed" {
  type    = bool
  default = false
}
