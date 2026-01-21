# NetOps 自动化运维平台 (v0.1)

![NetOps Banner](https://img.shields.io/badge/Version-v0.1--alpha-blue.svg)
![License](https://img.shields.io/badge/License-CC--BY--NC--4.0-red.svg)

**NetOps** 是一款专为网络工程师设计的轻量级、响应式自动化运维平台。它立足于“极速、透明、国产化适配”三大核心理念，通过现代化的 Web 界面将复杂的 Nornir 自动化逻辑转化为毫秒级的交互体验。

---

## ✨ 核心特性

- 🚀 **极速 SSH 连接引擎**：底层基于 Nornir + NAPALM 优化，通过禁用冗余 Agent 探测与延迟因子校准，实现 SSH 握手时间从 20s+ 降至 **1s 以内**。
- 📊 **可视化资产巡检墙**：一站式监控全网设备健康度。CPU、内存、温度及接口流量实时聚合展示，异常状态一目了然。
- 🛡️ **华为 VRP 深度适配**：完美适配华为 S5735 等主流国产交换机，通过 CLI 指令兜底解析与正则匹配，彻底解决内存利用率 0% 等解析难题。
- 📜 **实时命令审计 (Live-Flow)**：所有自动化执行步骤均包含底层 CLI 指令审计，运维过程黑盒变透明。
- 🔒 **并发安全与排队机制**：内置线程锁保护，防止多任务下发时对网络设备造成高频连接冲击。

---

## 🛠️ 技术栈

- **前端**: Vite + React + Tailwind CSS + Lucide Icons
- **后端**: Python 3.12 + FastAPI + SQLModel (SQLite)
- **执行引擎**: Nornir + NAPALM + Netmiko

---

## 🚀 启动指南

### 1. 克隆并安装环境
```bash
git clone https://github.com/your-repo/NetOps.git
cd NetOps
```

### 2. 后端部署 (Python 3.12+)
```bash
# 建议使用虚拟环境
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### 3. 前端部署 (Node.js 18+)
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 授权与限制 (Personal Use Only)

本项目版本：**v0.1-alpha**

> [!WARNING]
> **重要声明：本项目仅供个人学习、研究及非营利性内部管理使用。**
> 
> - **严禁商业用途**：禁止将本程序用于任何形式的营利、售卖或作为商业产品组成部分。
> - **无担保条款**：作者不对因使用本程序导致的生产环境设备故障、配置丢失或法律风险负责。
> - **版本状态**：当前为 v0.1 初创版本，主要用于核心架构验证。

---

## 🤝 参与贡献
由于本项目目前受“非商用”限制，暂不接受商业化分支。欢迎反馈 Bug 或提交针对国产化设备解析的优化 PR。
