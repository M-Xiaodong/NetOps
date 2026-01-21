import api from './api';

export interface Device {
    id: number;
    name: string;
    ip: string;
    platform: string;
    status: string;
    created_at: string;
    updated_at: string;
}

export const getDevices = async () => {
    const response = await api.get<Device[]>('/devices/');
    return response.data;
};

export const createDevice = async (data: Partial<Device>) => {
    const response = await api.post<Device>('/devices/', data);
    return response.data;
};

export const updateDevice = async (id: number, data: Partial<Device>) => {
    const response = await api.patch<Device>(`/devices/${id}`, data);
    return response.data;
};

export const deleteDevice = async (id: number) => {
    await api.delete(`/devices/${id}`);
};
