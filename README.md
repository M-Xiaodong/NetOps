# NetOps 自动化运维平台 (v0.1)

![NetOps Banner](https://img.shields.io/badge/Version-v0.1--alpha-blue.svg)
![License](https://img.shields.io/badge/License-CC--BY--NC--4.0-red.svg)

**NetOps** 是一款专为网络工程师设计的轻量级、响应式自动化运维平台。它立足于“极速、透明、国产化适配”三大核心理念，通过现代化的 Web 界面将复杂的 Nornir 自动化逻辑转化为毫秒级的交互体验。
## ✨ 核心功能

- 🚀 **配置备份**：对不同时间的配置文件进行比对。
- 📊 **网工工具箱**：IP计算器、划分子网、反掩码配置生成、单位换算、下载时间计算、MAC地址查询厂商并格式化文本、DNS解析结果对比差异。
详细功能见下图：
---
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/ccc46edc-3257-493f-b428-0deb03b169b6" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/5fdd7e71-b357-4a3a-830e-56629ddb9534" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/d3cc99bf-6b41-4380-b358-f799c2857b2f" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/84a2972c-f402-4836-84fd-b119513316d7" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/b5a73d20-a43d-44cd-9a18-cc15bfccf58f" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/f8a9a766-02c7-4db1-8377-006da5e443f3" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/b78338cc-fa96-4e26-a4ba-672bfe62118e" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/dc3c0717-8e70-4837-b2b5-6eb579bef57f" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/aea3bc5a-d6c7-4547-bf0c-f944513957af" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/a4c2cba7-cdd5-4204-8ea5-a68420d06155" />
<img width="1920" height="945" alt="image" src="https://github.com/user-attachments/assets/6382c0e4-239b-4157-a287-3e59ff48023d" />


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
