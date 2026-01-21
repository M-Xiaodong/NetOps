import api from './api';

export const triggerBackup = async (deviceNames?: string[]) => {
    const response = await api.post('/automation/backup', {
        device_names: deviceNames,
    });
    return response.data;
};

export const triggerInspect = async (deviceNames?: string[]) => {
    const response = await api.post('/automation/inspect', {
        device_names: deviceNames,
    });
    return response.data;
};
