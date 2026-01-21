import dns.resolver
import asyncio
import socket
from typing import List, Dict, Any

class DnsService:
    @staticmethod
    async def query(domain: str, record_type: str = 'A', nameserver: str = None) -> Dict[str, Any]:
        """Perform DNS Query (Aggressive Cluster Discovery for Complete Results)"""
        resolver = dns.resolver.Resolver()
        if nameserver:
            resolver.nameservers = [nameserver]
            resolver.timeout = 2.0
            resolver.lifetime = 3.0
        
        try:
            record_type = record_type.upper()
            all_ips = set()
            
            # 手动执行深度抓取逻辑
            async def fast_grab(target_domain):
                local_results = set()
                try:
                    # 并发两种主要查询：库查询与系统查询
                    async def fetch_dns_lib():
                        try:
                            # dnspython 的 resolve 在处理 CNAME 时会自动追随。
                            # 关键在于：有些应答包包含了多个 A 记录，我们需要遍历 Answer 全集。
                            ans = await asyncio.to_thread(resolver.resolve, target_domain, record_type)
                            res = set()
                            
                            # 核心修复点：遍历 Answer 原始响应中的所有 RRSet
                            for rrset in ans.response.answer:
                                if rrset.rdtype == dns.rdatatype.from_text(record_type):
                                    for rdata in rrset:
                                        res.add(str(rdata).rstrip('.'))
                                        
                            # 保底：也遍历解析器自身格式化后的结果
                            for rdata in ans:
                                res.add(str(rdata).rstrip('.'))
                            return res
                        except:
                            return set()

                    async def fetch_socket():
                        try:
                            family = socket.AF_INET if record_type == 'A' else socket.AF_INET6 if record_type == 'AAAA' else None
                            if family:
                                # getaddrinfo 是系统级的。
                                # 对于这种 CDN 域名，有时候 OS 解析层拿到的结果比单次 DNS 查询更全。
                                addr_info = await asyncio.to_thread(socket.getaddrinfo, target_domain, None, family=family)
                                return {item[4][0] for item in addr_info}
                        except:
                            return set()

                    # 执行并合并
                    dns_res, sock_res = await asyncio.gather(fetch_dns_lib(), fetch_socket())
                    local_results.update(dns_res)
                    local_results.update(sock_res)
                    
                    # 递归追踪：如果发现了 CNAME 别名，对别名也发起同样的探测
                    try:
                        cname_ans = await asyncio.to_thread(resolver.resolve, target_domain, 'CNAME')
                        for rdata in cname_ans:
                            alias = str(rdata.target).rstrip('.')
                            if alias != target_domain:
                                # 启发式：对探测到的每个 CNAME 执行深度查询
                                alias_ips = await fast_grab(alias)
                                local_results.update(alias_ips)
                    except:
                        pass
                        
                except:
                    pass
                return local_results

            # 主探测流程启动
            all_ips = await fast_grab(domain)
            
            # 针对 account.google.com 的特殊探测
            # 这是一个多级 CNAME。即便上述递归失败了，我们尝试强制探测其常见的 CDN 终点
            if len(all_ips) <= 1:
                try:
                    # 尝试猜测或获取其规范化的 Canonical Name
                    cname_chain = await asyncio.to_thread(resolver.resolve, domain, 'CNAME')
                    if cname_chain:
                        for c in cname_chain:
                            final_ips = await fast_grab(str(c.target).rstrip('.'))
                            all_ips.update(final_ips)
                except:
                    pass

            results = sorted(list(all_ips))

            return {
                "domain": domain,
                "type": record_type,
                "results": results,
                "nameserver": resolver.nameservers[0] if resolver.nameservers else "System",
                "status": "success" if results else "error",
                "error": None if results else "未找到解析记录"
            }
        except Exception as e:
            return {
                "domain": domain, "type": record_type, "results": [], "error": str(e), "status": "error"
            }

    @staticmethod
    async def query_compare(domain: str, servers: List[str], record_type: str = 'A') -> List[Dict[str, Any]]:
        tasks = [DnsService.query(domain, record_type, server) for server in servers]
        return await asyncio.gather(*tasks)
