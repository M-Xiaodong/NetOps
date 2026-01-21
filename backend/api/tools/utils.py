from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from fastapi.responses import StreamingResponse
from backend.models.user import User
from backend.api.auth.deps import get_current_active_user

# Services
from backend.services.tools.ip_calc import IPCalcService
from backend.services.tools.ping import PingService
from backend.services.tools.mac_tool import MacService
from backend.services.tools.dns_tool import DnsService
from backend.services.tools.tracert import TracertService
from backend.services.tools.port_scanner import PortScannerService
from backend.services.tools.http_tool import HttpToolService
from backend.services.tools.myip_tool import MyIpService

from backend.services.tools.port_speed import PortSpeedService

router = APIRouter()

# --- IP Calc ---
@router.post("/ip/calc")
def calculate_ip(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """IP Calculator (v4/v6)"""
    service = IPCalcService()
    try:
        return service.calculate_subnet(data.get("ip"), data.get("mask"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/subnet")
def subnet_tool(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """Subnet Calculator"""
    service = IPCalcService()
    try:
        return service.subnet(data.get("network"), int(data.get("new_prefix")))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/ip/acl")
def acl_tool(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """Generate ACL Info"""
    service = IPCalcService()
    return service.get_acl_info(data.get("ip"), data.get("mask"))

@router.post("/ip/huawei")
def huawei_config(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """Generate Huawei Config"""
    service = IPCalcService()
    return service.get_huawei_config(data.get("ip"), data.get("mask"))

@router.post("/calc-mask")
def calc_mask(data: dict = Body(...)):
    service = IPCalcService()
    return service.calc_mask(int(data.get("required_hosts", 0)))

@router.post("/summarize")
def summarize(data: dict = Body(...)):
    service = IPCalcService()
    return service.summarize(data.get("networks", []))

# --- Ping ---
@router.get("/ping/stream")
async def ping_stream(
    target: str = Query(...),
    count: int = Query(4),
    size: int = Query(32),
    ttl: int = Query(64),
    timeout: int = Query(1000),
    continuous: bool = Query(False),
    current_user: User = Depends(get_current_active_user)
):
    """Streaming Ping Results"""
    service = PingService()
    return StreamingResponse(
        service.ping_stream(target, count, size, ttl, timeout, continuous),
        media_type="text/event-stream"
    )

@router.post("/ping")
def ping_tool(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """Ping Host (Legacy)"""
    service = PingService()
    return service.ping_host(data.get("target"), int(data.get("count", 4)), int(data.get("size", 32)))

@router.post("/ping/batch")
def ping_batch_tool(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """Batch Ping"""
    service = PingService()
    return service.ping_batch(data.get("targets", []), int(data.get("count", 4)))

@router.post("/ping/batch/stream")
def ping_batch_stream(
    data: dict = Body(...),
    current_user: User = Depends(get_current_active_user)
):
    """Batch Ping Streaming"""
    service = PingService()
    # Note: Use a generator that iterates the async generator properly if needed, 
    # but FastAPI StreamingResponse supports async generators directly.
    return StreamingResponse(
        service.ping_batch_stream(
            data.get("targets", []), 
            int(data.get("count", 4)),
            int(data.get("size", 32)),
            int(data.get("ttl", 64)),
            bool(data.get("continuous", False))
        ),
        media_type="text/event-stream"
    )

# --- MAC ---
@router.post("/mac/lookup")
def mac_lookup(data: dict = Body(...)):
    res = MacService.query_batch_vendor([data.get("mac")])
    return {"vendor": res[0].get("vendor", "Unknown") if res else "Unknown"}

@router.post("/mac/batch")
def mac_batch(data: dict = Body(...)):
    return MacService.query_batch_vendor(data.get("macs", []), source=data.get("source", "offline"))

@router.post("/mac/format")
def mac_format(data: dict = Body(...)):
    return MacService.batch_format(data.get("macs", []))

# --- DNS / Tracert / Port ---
@router.post("/dns")
async def dns_lookup(data: dict = Body(...)):
    service = DnsService()
    return await service.query(data.get("domain"), data.get("record_type", "A"), data.get("nameserver"))

@router.post("/dns/compare")
async def dns_compare(data: dict = Body(...)):
    service = DnsService()
    return await service.query_compare(
        data.get("domain"), 
        data.get("servers", ["114.114.114.114", "8.8.8.8", "223.5.5.5"]), 
        data.get("record_type", "A")
    )

@router.get("/tracert/stream")
async def tracert_stream(
    target: str = Query(...),
    max_hops: int = Query(30),
    resolve: bool = Query(False),
    timeout: int = Query(4000),
    current_user: User = Depends(get_current_active_user)
):
    """Streaming Tracert Results"""
    service = TracertService()
    return StreamingResponse(
        service.trace_stream(target, max_hops, resolve, timeout),
        media_type="text/event-stream"
    )

@router.post("/tracert/batch/stream")
async def trace_batch_stream(request: Request):
    data = await request.json()
    return StreamingResponse(
        TracertService.trace_batch_stream(
            data.get("targets", []),
            int(data.get("max_hops", 30)),
            bool(data.get("resolve", False)),
            int(data.get("timeout", 1000))
        ),
        media_type="text/event-stream"
    )


@router.post("/tracert")
async def trace_route(data: dict = Body(...)):
    service = TracertService()
    return await service.run_trace(data.get("target"), data.get("max_hops", 15))

@router.post("/port-scan")
async def port_scan(data: dict = Body(...)):
    """增强版端口扫描 - 支持批量目标、网段、速度模式"""
    try:
        targets = PortScannerService.parse_targets(data.get("targets", data.get("target", "")))
        ports = PortScannerService.parse_ports(data.get("ports", "top100"))
        speed = data.get("speed", "standard")
        results = await PortScannerService.scan_batch(targets, ports, speed)
        return {"success": True, "results": results}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/port-scan/stream")
async def port_scan_stream(
    targets: str = Query(..., description="目标(逗号分隔或CIDR)"),
    ports: str = Query("top100", description="端口列表或预设名"),
    speed: str = Query("standard", description="扫描速度: fast/standard/deep")
):
    """流式端口扫描 (SSE)"""
    return StreamingResponse(
        PortScannerService.scan_stream(targets, ports, speed),
        media_type="text/event-stream"
    )

@router.post("/port-speed")
async def port_speed_test(data: dict = Body(...)):
    service = PortSpeedService()
    return await service.test_speed(
        data.get("target"), 
        int(data.get("port")), 
        int(data.get("count", 5)), 
        float(data.get("timeout", 2.0))
    )

# --- HTTP / SSL / MyIP ---
@router.post("/http/inspect")
def http_inspect(data: dict = Body(...)):
    service = HttpToolService()
    return service.inspect_url(data.get("url"))

@router.post("/http/ssl")
def ssl_check(data: dict = Body(...)):
    service = HttpToolService()
    return service.check_ssl(data.get("domain"))

@router.get("/myip")
async def my_ip():
    # Force use ipinfo for public ip lookup as requested
    return await MyIpService.get_multi_path_ip()

@router.post("/myip/batch")
def my_ip_batch(data: dict = Body(...)):
    # Default source to 'online' which uses the specified providers
    source = data.get("source", "online")
    return MyIpService.query_batch(data.get("ips", []), source=source)
