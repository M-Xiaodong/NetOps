import contextvars
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# 使用 contextvars 存储当前请求的上下文信息，确保在异步任务和线程中也能正确访问
request_ip_context = contextvars.ContextVar("client_ip", default=None)

class LogContextMiddleware(BaseHTTPMiddleware):
    """
    日志上下文中间件
    - 捕获每个请求的客户端 IP 地址
    - 将 IP 地址存储在 ContextVar 中，供 JsonFormatter 提取
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        
        # 处理代理转发的情况 (如果部署在反向代理后)
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            client_ip = x_forwarded_for.split(",")[0].strip()
            
        token = request_ip_context.set(client_ip)
        try:
            response = await call_next(request)
            return response
        finally:
            request_ip_context.reset(token)
