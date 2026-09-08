use anyhow::Result;
use std::process::Command;

/// Configure Windows Firewall rules for Printio.
/// Spawns a UAC-elevated PowerShell process to add inbound rules.
pub fn configure_firewall_rules() -> Result<String> {
    let ps_script = r#"
        $ErrorActionPreference = 'Stop'
        $group = 'Printio Hotspot Rules'

        # Remove existing rules in this group
        Get-NetFirewallRule -Group $group -ErrorAction SilentlyContinue | Remove-NetFirewallRule

        # Add DNS rule (UDP 53)
        New-NetFirewallRule `
            -DisplayName 'Printio DNS Server' `
            -Description 'Allows inbound UDP traffic on port 53 for Printio captive portal DNS' `
            -Direction Inbound `
            -Protocol UDP `
            -LocalPort 53 `
            -Action Allow `
            -Group $group `
            -Profile Any `
            -Enabled True

        # Add HTTP rule (TCP 80)
        New-NetFirewallRule `
            -DisplayName 'Printio HTTP Server' `
            -Description 'Allows inbound TCP traffic on port 80 for Printio captive portal and upload server' `
            -Direction Inbound `
            -Protocol TCP `
            -LocalPort 80 `
            -Action Allow `
            -Group $group `
            -Profile Any `
            -Enabled True

        Write-Output 'Firewall rules configured successfully'
    "#;

    // Use Start-Process with -Verb RunAs to trigger UAC elevation
    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','{}' ",
                ps_script
                    .replace('\'', "''")
                    .replace('\n', " ")
                    .replace('\r', "")
            ),
        ])
        .status()?;

    if status.success() {
        Ok("Firewall rules configured successfully".to_string())
    } else {
        Err(anyhow::anyhow!(
            "Firewall configuration failed or was cancelled by user"
        ))
    }
}

/// Check if Printio firewall rules already exist.
pub fn check_firewall_rules() -> Result<bool> {
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "Get-NetFirewallRule -Group 'Printio Hotspot Rules' -ErrorAction SilentlyContinue | Measure-Object | Select-Object -ExpandProperty Count",
        ])
        .output()?;

    let count_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let count: i32 = count_str.parse().unwrap_or(0);

    Ok(count >= 2) // We expect at least 2 rules (DNS + HTTP)
}

/// Remove Printio firewall rules.
pub fn remove_firewall_rules() -> Result<String> {
    let ps_script = r#"
        $ErrorActionPreference = 'Stop'
        Get-NetFirewallRule -Group 'Printio Hotspot Rules' -ErrorAction SilentlyContinue | Remove-NetFirewallRule
        Write-Output 'Firewall rules removed successfully'
    "#;

    let status = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-Command','{}' ",
                ps_script
                    .replace('\'', "''")
                    .replace('\n', " ")
                    .replace('\r', "")
            ),
        ])
        .status()?;

    if status.success() {
        Ok("Firewall rules removed successfully".to_string())
    } else {
        Err(anyhow::anyhow!("Failed to remove firewall rules"))
    }
}
