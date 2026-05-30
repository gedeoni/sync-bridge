export interface ApiResponse<T> {
  status: number;
  message: string;
  data?: T;
  errors?: Record<string, unknown>;
}

export const ok = <T>(message: string, data?: T): ApiResponse<T> => ({
  status: 200,
  message,
  ...(data !== undefined ? { data } : {}),
});

export const responseWithStatus = <T>(
  status: number,
  message: string,
  data?: T,
  errors?: Record<string, unknown>,
): ApiResponse<T> => ({
  status,
  message,
  ...(data !== undefined ? { data } : {}),
  ...(errors ? { errors } : {}),
});

