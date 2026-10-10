import axiosInstance from './axiosInstance';
import { AxiosRequestConfig, AxiosError } from 'axios';

interface ErrorResponse {
    message?: string;
    error?: string;
}

class ApiClient {
    /**
     * GET request
     */
    async get<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
        try {
            const response = await axiosInstance.get<T>(url, config);
            return response.data;
        } catch (error) {
            console.error('API GET error:', error);
            throw this.handleError(error);
        }
    }

    /**
     * POST request
     */
    async post<T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<T> {
        console.log(data);
        try {
            const response = await axiosInstance.post<T>(url, data, config);
            return response.data;
     
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * PUT request
     */
    async put<T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<T> {
        try {
            const response = await axiosInstance.put<T>(url, data, config);
            return response.data;
        } catch (error) {
            console.log(error);
            throw this.handleError(error);
        }
    }

    /**
     * PATCH request
     */
    async patch<T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}): Promise<T> {
        try {
            const response = await axiosInstance.patch<T>(url, data, config);
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * DELETE request
     */
    async delete<T = any>(url: string, config: AxiosRequestConfig = {}): Promise<T> {
        try {
            const response = await axiosInstance.delete<T>(url, {
                ...config,
                validateStatus: (status) => status >= 200 && status < 300,
            });
            if (response.status === 204) return null as T;
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Upload file (multipart/form-data)
     */
    async upload<T = any>(
        url: string,
        formData: FormData,
        onUploadProgress?: (progressEvent: any) => void
    ): Promise<T> {
        try {
            const response = await axiosInstance.post<T>(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress,
            });
            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Download file
     */
    async download(url: string, filename: string): Promise<Blob> {
        try {
            const response = await axiosInstance.get(url, {
                responseType: 'blob',
            });


            const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();


            window.URL.revokeObjectURL(downloadUrl);

            return response.data;
        } catch (error) {
            throw this.handleError(error);
        }
    }

    /**
     * Error handling
     */
    private handleError(error: unknown): Error {
        if (error instanceof AxiosError) {
            if (error.response) {
                const errorData = error.response.data as ErrorResponse;
                const message = errorData?.message || errorData?.error || 'An error occurred';
                const statusCode = error.response.status;
                if (statusCode === 204) {
                    return {
                        message: 'No content. Operation successful but no data returned.',
                        name: '',
                    };
                }
                 else if (statusCode === 404) {
                    return new Error('Resource not found.');
                } else if (statusCode === 500) {
                    return new Error(message !== 'An error occurred' ? `Server Error: ${message}` : 'Server error. Please try again later.');
                }

                return new Error(message);
            } else if (error.request) {

                return new Error('Cannot connect to server. Please check your network.');
            }
        }


        if (error instanceof Error) {
            return error;
        }

        return new Error('An unexpected error occurred');
    }
}


const apiClient = new ApiClient();
export default apiClient;