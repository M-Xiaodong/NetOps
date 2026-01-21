import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import ConfigManager from './pages/ConfigManager';
import DeviceManager from './pages/devices/DevicesPage';
import Tools from './pages/tools';
import Inspections from './pages/Inspections';
import Logs from './pages/system/Logs';
import Users from './pages/system/Users';
import Notifications from './pages/system/Notifications';
import SystemManagement from './pages/system/SystemManagement';
import SystemHome from './pages/system/SystemHome';
import Automation from './pages/automation/AutomationPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="configs" element={<ConfigManager />} />
                    <Route path="devices" element={<DeviceManager />} />
                    <Route path="inspections" element={<Inspections />} />
                    <Route path="automation" element={<Automation />} />
                    <Route path="tools" element={<Tools />} />
                    <Route path="system" element={<SystemManagement />}>
                        <Route index element={<SystemHome />} />
                        <Route path="logs" element={<Logs />} />
                        <Route path="users" element={<Users />} />
                        <Route path="notifications" element={<Notifications />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
