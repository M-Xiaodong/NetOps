import { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, Users as UsersIcon, Trash2, Mail, BadgeCheck, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
    id: number;
    username: string;
    email: string | null;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const baseUrl = window.location.port === '5173'
                ? `${window.location.protocol}//${window.location.hostname}:8000`
                : '';
            const apiUrl = `${baseUrl}/api/system/users`;

            const res = await fetch(apiUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                console.error("Fetch users error:", res.status);
            }
        } catch (err) {
            console.error("Users fetch exception:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number, username: string) => {
        if (!window.confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) return;

        try {
            const token = localStorage.getItem('token');
            const baseUrl = window.location.port === '5173'
                ? `${window.location.protocol}//${window.location.hostname}:8000`
                : '';
            const apiUrl = `${baseUrl}/api/system/users/${id}`;

            const res = await fetch(apiUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== id));
            } else {
                const data = await res.json();
                alert(data.detail || "删除失败");
            }
        } catch (err) {
            alert("删除请求失败");
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col h-full bg-white animate-fade-in-scale">
            {/* Header Area */}
            <header className="h-16 border-b border-slate-100 flex items-center px-8 justify-between shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shadow-sm border border-blue-100">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase">用户管理</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchUsers}
                        className="p-2 rounded-full hover:bg-slate-50 text-slate-400 transition-all hover:rotate-180 duration-500"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 shadow-md">
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>新增用户</span>
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-hidden flex flex-col bg-slate-50/20">
                <div className="p-6 border-b border-slate-100 bg-white/50">
                    <div className="relative max-w-sm group">
                        <Search className="h-4 w-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                        <input
                            placeholder="搜索用户名或姓名..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading && users.length === 0 ? (
                            Array(6).fill(0).map((_, i) => (
                                <div key={i} className="h-40 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                            ))
                        ) : filteredUsers.length === 0 ? (
                            <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-40">
                                <UsersIcon className="h-12 w-12 mb-4 text-slate-300" />
                                <span className="text-sm font-bold text-slate-400">
                                    {loading ? '正在同步数据...' : '未发现符合条件的用户'}
                                </span>
                            </div>
                        ) : (
                            filteredUsers.map((user) => (
                                <div key={user.id} className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-black shadow-lg shadow-slate-900/10 group-hover:scale-110 transition-transform">
                                                {user.username.substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 flex items-center gap-1.5">
                                                    {user.username}
                                                    {user.role === 'admin' && <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />}
                                                </h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.role}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(user.id, user.username)}
                                            className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                                            <Mail className="h-3 w-3" />
                                            <span>{user.email || '未填写邮箱'}</span>
                                        </div>
                                        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("w-2 h-2 rounded-full", user.is_active ? "bg-emerald-500" : "bg-slate-300")} />
                                                <span className="text-[10px] font-black text-slate-400 uppercase">{user.is_active ? '正常运行' : '已禁用'}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-300 font-mono">ID: {user.id}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
