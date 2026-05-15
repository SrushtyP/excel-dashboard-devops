output "vm_running_ip" {
  description = "Public IP of vm-running (app is deployed here)"
  value       = azurerm_public_ip.pip_running.ip_address
}

output "vm_snoozed_ip" {
  description = "Public IP of vm-snoozed"
  value       = azurerm_public_ip.pip_snoozed.ip_address
}

output "vm_destroyed_ip" {
  description = "Public IP of vm-destroyed (only exists when provisioned)"
  value       = var.create_vm_destroyed ? azurerm_public_ip.pip_destroyed[0].ip_address : "not provisioned"
}

output "app_url" {
  description = "URL to access the Flask app"
  value       = "http://${azurerm_public_ip.pip_running.ip_address}:5000"
}

output "ssh_command" {
  description = "SSH into vm-running"
  value       = "ssh azureuser@${azurerm_public_ip.pip_running.ip_address}"
}
