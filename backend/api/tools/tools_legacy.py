from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
import platform
import ipaddress
from loguru import logger
from typing import List
import requests
import socket
import dns.resolver

router = APIRouter()

# --- Models ---

class PingRequest(BaseModel):
    target: str
    count: int = 4

class IPCalcRequest(BaseModel):
    ip: str
    mask: str = None

class SubnetRequest(BaseModel):
    network: str
    new_prefix: int

class CalcMaskRequest(BaseModel):
    required_hosts: int

class SummarizeRequest(BaseModel):
    networks: list[str]

class MacLookupRequest(BaseModel):
    mac: str

class PortScanRequest(BaseModel):
    target: str
    ports: List[int]

class TraceRouteRequest(BaseModel):
    target: str

class DnsLookupRequest(BaseModel):
    domain: str
    record_type: str = "A"

# --- Endpoints ---

@router.post("/ping")
async def ping_tool(request: PingRequest):
    """Execute a system ping command."""
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, str(request.count), request.target]
    try:
        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        stdout, stderr = process.communicate()
        return {
            "target": request.target,
            "output": stdout,
            "error": stderr,
            "success": process.returncode == 0
        }
    except Exception as e:
        logger.error(f"Ping failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ip-calc")
async def ip_calc_tool(request: IPCalcRequest):
    """Calculate IP subnet details."""
    try:
        network_str = f"{request.ip}/{request.mask}" if request.mask else request.ip
        network = ipaddress.ip_network(network_str, strict=False)
        
        netmask_int = int(network.netmask)
        wildcard_int = netmask_int ^ 0xFFFFFFFF
        wildcard_mask = str(ipaddress.IPv4Address(wildcard_int))

        binary_ip = f"{int(network.network_address):032b}"
        binary_mask = f"{int(network.netmask):032b}"
        
        first_octet = int(str(network.network_address).split('.')[0])
        if 1 <= first_octet <= 126: ip_class = 'A'
        elif 128 <= first_octet <= 191: ip_class = 'B'
        elif 192 <= first_octet <= 223: ip_class = 'C'
        elif 224 <= first_octet <= 239: ip_class = 'D (Multicast)'
        elif 240 <= first_octet <= 255: ip_class = 'E (Experimental)'
        else: ip_class = 'Unknown'

        return {
            "input": network_str,
            "network_address": str(network.network_address),
            "broadcast_address": str(network.broadcast_address),
            "netmask": str(network.netmask),
            "wildcard_mask": wildcard_mask,
            "hostmask": str(network.hostmask),
            "num_addresses": network.num_addresses,
            "prefixlen": network.prefixlen,
            "version": network.version,
            "first_host": str(network.network_address + 1),
            "last_host": str(network.broadcast_address - 1),
            "binary_ip": ' '.join([binary_ip[i:i+8] for i in range(0, 32, 8)]),
            "binary_mask": ' '.join([binary_mask[i:i+8] for i in range(0, 32, 8)]),
            "ip_class": ip_class
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid IP/Mask: {e}")
    except Exception as e:
        logger.error(f"IP Calc failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subnet")
async def subnet_tool(request: SubnetRequest):
    """Calculate subnets."""
    try:
        network = ipaddress.ip_network(request.network, strict=False)
        if request.new_prefix <= network.prefixlen:
             raise HTTPException(status_code=400, detail="New prefix must be longer than current prefix")
        
        subnets = list(network.subnets(new_prefix=request.new_prefix))
        if len(subnets) > 1024:
             raise HTTPException(status_code=400, detail="Too many subnets generated (limit 1024)")

        return [
            {
                "network": str(sn),
                "range": f"{sn.network_address + 1} - {sn.broadcast_address - 1}",
                "broadcast": str(sn.broadcast_address),
                "hosts": sn.num_addresses - 2
            }
            for sn in subnets
        ]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Network: {e}")
    except Exception as e:
        logger.error(f"Subnet calc failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calc-mask")
async def calc_mask_tool(request: CalcMaskRequest):
    """Calculate mask for required hosts."""
    try:
        if request.required_hosts <= 0:
            raise HTTPException(status_code=400, detail="Hosts must be > 0")
            
        host_bits = 0
        while (2 ** host_bits) - 2 < request.required_hosts:
            host_bits += 1
            if host_bits > 30:
                 raise HTTPException(status_code=400, detail="Too many hosts required")
        
        prefix_len = 32 - host_bits
        capacity = (2 ** host_bits) - 2
        dummy_net = ipaddress.ip_network(f"0.0.0.0/{prefix_len}")
        
        return {
            "required_hosts": request.required_hosts,
            "prefix_len": prefix_len,
            "mask": str(dummy_net.netmask),
            "capacity": capacity,
            "host_bits": host_bits
        }
    except Exception as e:
        logger.error(f"Calc mask failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/summarize")
async def summarize_tool(request: SummarizeRequest):
    """Summarize networks."""
    try:
        networks = [ipaddress.ip_network(n.strip(), strict=False) for n in request.networks if n.strip()]
        if not networks:
            raise HTTPException(status_code=400, detail="No valid networks provided")
            
        summary_list = list(ipaddress.collapse_addresses(networks))
        return {
            "summary_routes": [str(n) for n in summary_list],
            "count": len(summary_list)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Network in list: {e}")
    except Exception as e:
        logger.error(f"Summarize failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mac")
async def mac_lookup_tool(request: MacLookupRequest):
    """Look up MAC vendor."""
    try:
        mac = request.mac.replace(":", "").replace("-", "").replace(".", "").upper()
        if len(mac) != 12:
             raise HTTPException(status_code=400, detail="Invalid MAC address format")
        
        vendor = "Unknown"
        try:
            resp = requests.get(f"https://macvendors.co/api/{mac}", timeout=3)
            if resp.status_code == 200:
                data = resp.json()
                vendor = data.get('result', {}).get('company', 'Unknown')
        except Exception:
            vendor = "Lookup Failed (Network Error)"

        return {"mac": request.mac, "vendor": vendor}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.post("/port-scan")
async def port_scan_tool(request: PortScanRequest):
    """Scan ports."""
    results = []
    try:
        target_ip = socket.gethostbyname(request.target)
        for port in request.ports:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((target_ip, port))
            status = "open" if result == 0 else "closed"
            results.append({"port": port, "status": status})
            sock.close()
        return {"target": request.target, "ip": target_ip, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tracert")
async def trace_route_tool(request: TraceRouteRequest):
    """Execute tracert."""
    try:
        cmd = ["tracert", "-d", "-h", "15", request.target] if platform.system().lower() == "windows" else ["traceroute", "-m", "15", request.target]
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()
        if process.returncode != 0:
             raise Exception(stderr or "Trace failed")
        return {"output": stdout}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/dns")
async def dns_lookup_tool(request: DnsLookupRequest):
    """DNS Lookup."""
    try:
        answers = dns.resolver.resolve(request.domain, request.record_type)
        results = [str(r) for r in answers]
        return {"domain": request.domain, "type": request.record_type, "results": results}
    except Exception as e:
        return {"domain": request.domain, "type": request.record_type, "results": [], "error": str(e)}
