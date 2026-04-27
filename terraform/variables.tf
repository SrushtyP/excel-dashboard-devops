variable "subscription_id" { type = string }
variable "client_id"       { type = string }
variable "client_secret"   {
  type      = string
  sensitive = true
}
variable "tenant_id"       { type = string }
variable "resource_group_name" {
  type    = string
  default = "rg-dashboard-demo"
}
variable "location" {
  type    = string
  default = "centralus"
}
variable "vm_name" {
  type    = string
  default = "vm-dashboard"
}
variable "admin_username" {
  type    = string
  default = "azureuser"
}
variable "admin_password" {
  type      = string
  sensitive = true
}
