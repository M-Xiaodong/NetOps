import re
import os

class ConfigAnalyzer:
    @staticmethod
    def analyze_filename(filename: str):
        """
        Analyze filename to detect system name and suggested region.
        """
        # Simple heuristic: if filename contains "办公区" or "Office", suggest "Office" type region
        # if "IDC", suggest "IDC" type region
        region_type = "unknown"
        lower_name = filename.lower()
        if "办公区" in filename or "office" in lower_name:
            region_type = "office"
        elif "idc" in lower_name:
            region_type = "idc"
            
        # Try to extract hostname from filename (e.g., "SwitchA_2023.cfg" -> "SwitchA")
        # Strategy: Split by _ or -, look for the longest part that isn't a date or common word?
        # Or just take the part before the first date-like string?
        # For now, let's just return the whole stem if simple split fails, or try to be smarter.
        # Let's try to find the part that is NOT "Office", "IDC", "BJ", "SH", date.
        
        parts = re.split(r'[_\-\.]', filename)
        potential_name = filename.split('.')[0] # Default to stem
        
        # Filter out common non-hostname parts
        filtered_parts = [p for p in parts if p.lower() not in ['office', 'idc', 'bj', 'sh', 'cfg', 'zip', 'txt', 'conf'] and not re.match(r'^\d+$', p)]
        
        if filtered_parts:
            # Pick the longest remaining part as a guess
            potential_name = max(filtered_parts, key=len)
        
        return {
            "suggested_region_type": region_type,
            "potential_hostname": potential_name
        }

    @staticmethod
    def analyze_content(content: str):
        """
        Analyze configuration content to detect device type, vendor, model, and management IP.
        """
        info = {
            "device_type": "unknown",
            "vendor": "unknown",
            "model": "unknown",
            "version": "unknown",
            "management_ip": None
        }

        # --- Vendor Detection ---
        if "Huawei" in content or "HUAWEI" in content:
            info["vendor"] = "Huawei"
        elif "Cisco" in content or "CISCO" in content:
            info["vendor"] = "Cisco"
        elif "H3C" in content:
            info["vendor"] = "H3C"
        elif "Ruijie" in content:
            info["vendor"] = "Ruijie"
        elif "Hillstone" in content:
            info["vendor"] = "Hillstone"
        elif "Sangfor" in content:
            info["vendor"] = "Sangfor"
        elif "Inspur" in content:
            info["vendor"] = "Inspur"
        
        # Infer vendor from keywords if still unknown
        if info["vendor"] == "unknown":
            if "sysname" in content or "vlan batch" in content or "display" in content:
                 # H3C also uses sysname, but vlan batch is more specific to Huawei usually.
                 # Let's default to Huawei for sysname if not H3C specific
                 info["vendor"] = "Huawei"
            elif "hostname" in content and "interface" in content:
                 info["vendor"] = "Cisco"

        # --- Device Type Detection ---
        # Keywords for Switch
        if any(k in content for k in ["vlan batch", "interface Vlanif", "stp enable", "spanning-tree"]):
            info["device_type"] = "switch"
        # Keywords for Firewall
        elif any(k in content for k in ["firewall zone", "security-policy", "ip service-set"]):
            info["device_type"] = "firewall"
        # Keywords for Router (often overlaps with L3 switch, need specific checks)
        elif any(k in content for k in ["ip route-static", "router bgp", "router ospf"]) and info["device_type"] == "unknown":
             # If it has routing but no obvious switching traits, maybe router. 
             # But L3 switches have these too. Let's default to switch if ambiguous, or router if explicit "Router" in sysname
             info["device_type"] = "router"
        # Keywords for AC
        elif any(k in content for k in ["wlan", "ap-group", "ap-id"]):
            info["device_type"] = "wireless_ac"
        # Keywords for Server (Linux/Ubuntu/Windows)
        elif "Ubuntu" in content:
            info["device_type"] = "server"
            info["vendor"] = "Ubuntu"
        elif "Microsoft Windows" in content:
            info["device_type"] = "server"
            info["vendor"] = "Microsoft"
        
        # --- Management IP Detection ---
        # Try to find an IP address on a management interface or Vlanif
        # Regex for IP: \d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}
        
        # Strategy 1: Look for "ip address <ip> <mask>" pattern common in network gear
        ip_match = re.search(r"ip address (\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})", content)
        if ip_match:
            info["management_ip"] = ip_match.group(1)
            
        return info
