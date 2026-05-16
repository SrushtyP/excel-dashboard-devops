output "vm_running_ip" {
  description = "Public IP of vm-running (app deployed here)"
  value       = azurerm_public_ip.pip_running.ip_address
}

output "vm_snoozed_ip" {
  description = "Public IP of vm-snoozed (deallocated)"
  value       = azurerm_public_ip.pip_snoozed.ip_address
}

output "vm_destroyed_ip" {
  description = "Public IP of vm-destroyed (only when provisioned)"
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
