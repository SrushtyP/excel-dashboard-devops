variable "subscription_id" {}
variable "client_id" {}
variable "client_secret" {}
variable "tenant_id" {}
variable "admin_password" {}

variable "resource_group_name" {
  default = "rg-drishti-demo"
}

variable "location" {
  default = "southafricanorth"
}

variable "admin_username" {
  default = "azureuser"
}

# Change this if capacity issues occur — no need to touch main.tf
variable "vm_size" {
  default = "Standard_B1s"
}

# Set to true to provision vm-destroyed, false to destroy it
variable "create_vm_destroyed" {
  type    = bool
  default = false
}
