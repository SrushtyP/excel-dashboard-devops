output "public_ip_address" {
  description = "Public IP of the VM"
  value       = azurerm_public_ip.public_ip.ip_address
}

output "ssh_command" {
  description = "Command to SSH into the VM"
  value       = "ssh azureuser@${azurerm_public_ip.public_ip.ip_address}"
}

output "app_url" {
  description = "URL to access the Flask app"
  value       = "http://${azurerm_public_ip.public_ip.ip_address}:5000"
}
