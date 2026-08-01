export interface ApiSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export type ApiResponse<T = unknown> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
