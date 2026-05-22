output "vm_running_ip" {
  description = "Public IP of vm-running"
  value       = azurerm_public_ip.pip_running.ip_address
}

output "vm_snoozed_ip" {
  description = "Public IP of vm-snoozed"
  value       = azurerm_public_ip.pip_snoozed.ip_address
}

output "vm_destroyed_ip" {
  description = "Public IP of vm-destroyed (only set when create_vm_destroyed = true)"
  value       = var.create_vm_destroyed ? azurerm_public_ip.pip_destroyed[0].ip_address : ""
}
