import ipaddress
from typing import Dict, Any, List

class IPCalcService:
    def calculate_subnet(self, network_str: str, mask: str = None) -> Dict[str, Any]:
        """Analyze IP Network (v4/v6)"""
        try:
            if mask:
                network_str = f"{network_str}/{mask}"
            
            network = ipaddress.ip_network(network_str, strict=False)
            is_v6 = network.version == 6
            
            netmask = str(network.netmask)
            wildcard = None
            if not is_v6:
                # Wildcard only for v4 usually
                wildcard_int = int(network.netmask) ^ 0xFFFFFFFF
                wildcard = str(ipaddress.IPv4Address(wildcard_int))
            
            return {
                "input": network_str,
                "version": network.version,
                "network_address": str(network.network_address),
                "broadcast_address": str(network.broadcast_address) if not is_v6 else "N/A",
                "netmask": netmask,
                "wildcard_mask": wildcard,
                "hostmask": str(network.hostmask),
                "num_addresses": network.num_addresses,
                "prefixlen": network.prefixlen,
                "first_host": str(network.network_address + 1) if not is_v6 else str(network.network_address + 1),
                "last_host": str(network.broadcast_address - 1) if not is_v6 else str(network.broadcast_address -1), # Technically v6 range is huge
                "ip_class": self._get_class(network) if not is_v6 else "IPv6",
                "binary_ip": self._to_binary(network.network_address, network.version),
                "binary_mask": self._to_binary(network.netmask, network.version)
            }
        except ValueError as e:
            raise ValueError(f"Invalid IP/Network: {e}")

    def subnet(self, network_str: str, new_prefix: int) -> List[Dict]:
        """Subnet a network"""
        network = ipaddress.ip_network(network_str, strict=False)
        if new_prefix <= network.prefixlen:
            raise ValueError("New prefix must be longer")
        
        # Limit to 1024 subnets to prevent DOS
        count = 0
        results = []
        # Using .subnets() generator
        try:
            for sn in network.subnets(new_prefix=new_prefix):
                count += 1
                if count > 1024: break
                results.append({
                    "network": str(sn),
                    "range": f"{sn[1]} - {sn[-2]}" if sn.version == 4 else str(sn),
                    "broadcast": str(sn.broadcast_address) if sn.version == 4 else "N/A",
                    "hosts": sn.num_addresses - 2 if sn.version == 4 else sn.num_addresses
                })
        except Exception as e:
            raise ValueError(str(e))
            
        return results

    def _get_class(self, network) -> str:
         first = int(str(network.network_address).split('.')[0])
         if 1 <= first <= 126: return 'A'
         elif 128 <= first <= 191: return 'B'
         elif 192 <= first <= 223: return 'C'
         elif 224 <= first <= 239: return 'D (Multicast)'
         else: return 'E/Unknown'

    def _to_binary(self, addr, version) -> str:
        if version == 4:
            bits = f"{int(addr):032b}"
            return ' '.join([bits[i:i+8] for i in range(0, 32, 8)])
        else:
            bits = f"{int(addr):0128b}"
            # Show abbreviated binary for v6? It's too long.
            return "IPv6 Binary Omitted"

    def get_acl_info(self, network_str: str, mask: str = None) -> Dict[str, str]:
        """Generate ACL/Prefix List syntax"""
        try:
            if mask: network_str = f"{network_str}/{mask}"
            
            if '/' not in network_str and not mask: 
               network = ipaddress.ip_network(f"{network_str}/32", strict=False)
            else:
               network = ipaddress.ip_network(network_str, strict=False)

            is_v6 = network.version == 6
            wildcard = str(ipaddress.IPv4Address(int(network.netmask) ^ 0xFFFFFFFF)) if not is_v6 else "N/A"
            net = str(network.network_address)
            prefix = network.prefixlen
            
            info = {}
            if not is_v6:
                info["std_acl"] = f"access-list 10 permit {net} {wildcard}"
                info["ext_acl_src"] = f"access-list 100 permit ip {net} {wildcard} any"
                info["ext_acl_dst"] = f"access-list 100 permit ip any {net} {wildcard}"
                info["prefix_list"] = f"ip prefix-list LIST permit {net}/{prefix}"
                info["route_map"] = f"match ip address prefix-list LIST"
                info["network_cmd"] = f"network {net} mask {str(network.netmask)}"
                info["wildcard_cmd"] = f"network {net} {wildcard}"
            else:
                info["std_acl"] = f"ipv6 access-list ACL_V6\n permit ipv6 {net}/{prefix} any"
                info["prefix_list"] = f"ipv6 prefix-list LIST permit {net}/{prefix}"
            
            return info
        except Exception:
            return {}

    def calc_mask(self, required_hosts: int) -> Dict[str, Any]:
        """Calculate mask required for X hosts"""
        if required_hosts <= 0:
            return {"error": "Hosts must be > 0"}
        
        # hosts + 2 (net + broadcast)
        total = required_hosts + 2
        prefix = 32 - (total - 1).bit_length()
        if prefix < 0:
            return {"error": "Too many hosts for IPv4"}
            
        mask = ipaddress.IPv4Network(f"0.0.0.0/{prefix}").netmask
        return {
            "required_hosts": required_hosts,
            "prefix": prefix,
            "mask": str(mask),
            "total_addresses": 2**(32-prefix)
        }

    def get_huawei_config(self, ip: str, mask: str = None) -> Dict[str, Any]:
        """生成华为特定配置"""
        try:
            # 兼容处理：如果传入的 ip 已经带有斜杠（如 10.1.1.1/24），则优先处理
            if '/' in ip:
                network = ipaddress.IPv4Network(ip, strict=False)
            else:
                network = ipaddress.IPv4Network(f"{ip}/{mask}", strict=False)
                
            net_address = str(network.network_address)
            wildcard = str(network.hostmask)
            prefix = network.prefixlen

            return {
                "acl_basic": [
                    f"acl number 2000",
                    f" rule 5 permit source {net_address} {wildcard}"
                ],
                "acl_advanced": [
                    f"acl number 3000",
                    f" rule 5 permit ip source {net_address} {wildcard} destination any"
                ],
                "prefix_list": [
                    f"ip ip-prefix LIST_NAME index 10 permit {net_address} {prefix}"
                ],
                "interface_config": [
                    f"interface GigabitEthernet 0/0/0",
                    f" ip address {net_address} {str(network.netmask)}"
                ]
            }
        except Exception as e:
            return {"error": str(e)}

    def summarize(self, networks: List[str]) -> List[str]:
        """Aggregate/Summarize networks"""
        try:
            objs = [ipaddress.ip_network(n.strip(), strict=False) for n in networks if n.strip()]
            summary = ipaddress.collapse_addresses(objs)
            return [str(s) for s in summary]
        except Exception as e:
            return [f"Error: {str(e)}"]

def cli_main():
    import argparse
    import sys
    from rich.console import Console
    from rich.table import Table

    console = Console()
    parser = argparse.ArgumentParser(description="NetOps IP 计算器 (独立版)")
    subparsers = parser.add_subparsers(dest="command", help="子命令")

    # Calc
    calc_parser = subparsers.add_parser("calc", help="分析 IP/网段")
    calc_parser.add_argument("network", help="IP 或网段 (如 192.168.1.1/24)")

    # Subnet
    sub_parser = subparsers.add_parser("subnet", help="子网划分")
    sub_parser.add_argument("network", help="网段 (如 192.168.1.0/24)")
    sub_parser.add_argument("prefix", type=int, help="新掩码长度 (如 26)")

    # ACL
    acl_parser = subparsers.add_parser("acl", help="生成 ACL 脚本")
    acl_parser.add_argument("network", help="IP 或网段")

    args = parser.parse_args()
    service = IPCalcService()

    if args.command == "calc":
        try:
            res = service.calculate_subnet(args.network)
            table = Table(title=f"IP 分析报告: {args.network}")
            table.add_column("项目", style="cyan")
            table.add_column("结果", style="green")
            for k, v in res.items():
                if k not in ["binary_ip", "binary_mask"]:
                    table.add_row(k.replace("_", " ").title(), str(v))
            console.print(table)
        except Exception as e:
            console.print(f"[red]错误: {e}[/red]")

    elif args.command == "subnet":
        try:
            res = service.subnet(args.network, args.prefix)
            table = Table(title=f"子网拆分报告 (/ {args.prefix})")
            table.add_column("子网", style="cyan")
            table.add_column("范围", style="green")
            table.add_column("可用地址数", justify="right")
            for item in res:
                table.add_row(item["network"], item["range"], str(item["hosts"]))
            console.print(table)
        except Exception as e:
            console.print(f"[red]错误: {e}[/red]")

    elif args.command == "acl":
        res = service.get_acl_info(args.network)
        table = Table(title=f"ACL 脚本参考: {args.network}")
        table.add_column("类型", style="cyan")
        table.add_column("脚本内容", style="yellow")
        for k, v in res.items():
            table.add_row(k.replace("_", " ").upper(), v)
        console.print(table)
    else:
        parser.print_help()

if __name__ == "__main__":
    cli_main()
