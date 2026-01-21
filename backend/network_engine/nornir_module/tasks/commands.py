from nornir.core.task import Task, Result
from nornir_netmiko.tasks import netmiko_send_command, netmiko_send_config
import logging

logger = logging.getLogger("automation")

def run_commands(task: Task, commands: list) -> Result:
    """执行 show 命令集"""
    results = []
    for cmd in commands:
        res = task.run(task=netmiko_send_command, command_string=cmd)
        results.append(f"--- {cmd} ---\n{res.result}")
    
    return Result(host=task.host, result="\n".join(results))

def apply_config(task: Task, config_commands: list) -> Result:
    """下发配置命令集"""
    res = task.run(task=netmiko_send_config, config_commands=config_commands)
    return Result(host=task.host, result=res.result)
