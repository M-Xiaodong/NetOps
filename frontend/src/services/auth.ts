import api from './api';

export interface LoginResponse {
    access_token: string;
    token_type: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post<LoginResponse>('/auth/login', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    });
    return response.data;
};

export const register = async (username: string, password: string, email?: string) => {
    const response = await api.post('/auth/register', {
        username,
        password,
        email,
    });
    return response.data;
};
