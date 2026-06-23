terraform {
  backend "azurerm" {
    resource_group_name  = "rg-drishti-demo"
    storage_account_name = "stgterraformdrishti001"
    container_name       = "tfstate"
    key                  = "dashboard.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
}

resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# ── VM-RUNNING — Central India ─────────────────────────────────────────────────

resource "azurerm_virtual_network" "vnet_running" {
  name                = "vnet-running"
  address_space       = ["10.1.0.0/16"]
  location            = var.location_running
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet_running" {
  name                 = "subnet-running"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet_running.name
  address_prefixes     = ["10.1.1.0/24"]
}

resource "azurerm_network_security_group" "nsg_running" {
  name                = "nsg-running"
  location            = var.location_running
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "allow-ssh"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-http"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-flask"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5000"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_public_ip" "pip_running" {
  name                = "pip-vm-running"
  location            = var.location_running
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "nic_running" {
  name                = "nic-vm-running"
  location            = var.location_running
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet_running.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip_running.id
  }
}

resource "azurerm_network_interface_security_group_association" "nic_nsg_running" {
  network_interface_id      = azurerm_network_interface.nic_running.id
  network_security_group_id = azurerm_network_security_group.nsg_running.id
}

resource "azurerm_linux_virtual_machine" "vm_running" {
  name                            = "vm-running"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = var.location_running
  size                            = var.vm_size
  admin_username                  = var.admin_username
  admin_password                  = var.admin_password
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.nic_running.id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}

# ── VM-SNOOZED — Korea Central ─────────────────────────────────────────────────

resource "azurerm_virtual_network" "vnet_snoozed" {
  name                = "vnet-snoozed"
  address_space       = ["10.2.0.0/16"]
  location            = var.location_snoozed
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet_snoozed" {
  name                 = "subnet-snoozed"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet_snoozed.name
  address_prefixes     = ["10.2.1.0/24"]
}

resource "azurerm_network_security_group" "nsg_snoozed" {
  name                = "nsg-snoozed"
  location            = var.location_snoozed
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "allow-ssh"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-http"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-flask"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5000"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_public_ip" "pip_snoozed" {
  name                = "pip-vm-snoozed"
  location            = var.location_snoozed
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "nic_snoozed" {
  name                = "nic-vm-snoozed"
  location            = var.location_snoozed
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet_snoozed.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip_snoozed.id
  }
}

resource "azurerm_network_interface_security_group_association" "nic_nsg_snoozed" {
  network_interface_id      = azurerm_network_interface.nic_snoozed.id
  network_security_group_id = azurerm_network_security_group.nsg_snoozed.id
}

resource "azurerm_linux_virtual_machine" "vm_snoozed" {
  name                            = "vm-snoozed"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = var.location_snoozed
  size                            = var.vm_size
  admin_username                  = var.admin_username
  admin_password                  = var.admin_password
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.nic_snoozed.id]

  lifecycle {
    ignore_changes = [size, os_disk]
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}

# ── VM-DESTROYED — South Africa North (not provisioned by default) ─────────────

resource "azurerm_virtual_network" "vnet_destroyed" {
  count               = var.create_vm_destroyed ? 1 : 0
  name                = "vnet-destroyed"
  address_space       = ["10.3.0.0/16"]
  location            = var.location_destroyed
  resource_group_name = azurerm_resource_group.rg.name
}

resource "azurerm_subnet" "subnet_destroyed" {
  count                = var.create_vm_destroyed ? 1 : 0
  name                 = "subnet-destroyed"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet_destroyed[0].name
  address_prefixes     = ["10.3.1.0/24"]
}

resource "azurerm_network_security_group" "nsg_destroyed" {
  count               = var.create_vm_destroyed ? 1 : 0
  name                = "nsg-destroyed"
  location            = var.location_destroyed
  resource_group_name = azurerm_resource_group.rg.name

  security_rule {
    name                       = "allow-ssh"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-http"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "allow-flask"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_public_ip" "pip_destroyed" {
  count               = var.create_vm_destroyed ? 1 : 0
  name                = "pip-vm-destroyed"
  location            = var.location_destroyed
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_network_interface" "nic_destroyed" {
  count               = var.create_vm_destroyed ? 1 : 0
  name                = "nic-vm-destroyed"
  location            = var.location_destroyed
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.subnet_destroyed[0].id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip_destroyed[0].id
  }
}

resource "azurerm_network_interface_security_group_association" "nic_nsg_destroyed" {
  count                     = var.create_vm_destroyed ? 1 : 0
  network_interface_id      = azurerm_network_interface.nic_destroyed[0].id
  network_security_group_id = azurerm_network_security_group.nsg_destroyed[0].id
}

resource "azurerm_linux_virtual_machine" "vm_destroyed" {
  count                           = var.create_vm_destroyed ? 1 : 0
  name                            = "vm-destroyed"
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = var.location_destroyed
  size                            = var.vm_size
  admin_username                  = var.admin_username
  admin_password                  = var.admin_password
  disable_password_authentication = false
  network_interface_ids           = [azurerm_network_interface.nic_destroyed[0].id]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}
