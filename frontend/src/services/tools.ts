import api from './api';

export const calculateIP = async (network: string) => {
    const response = await api.get('/tools/ip/calc', {
        params: { network },
    });
    return response.data;
};

export const pingHost = async (host: string, count: number = 4) => {
    const response = await api.post('/tools/ping', null, {
        params: { host, count },
    });
    return response.data;
};
