export enum Role {
  WARGA = 'WARGA',
  BENDAHARA = 'BENDAHARA',
  KETUA = 'KETUA',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum NotificationType {
  PAYMENT_SUBMITTED = 'PAYMENT_SUBMITTED',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  EXPENSE_SUBMITTED = 'EXPENSE_SUBMITTED',
  EXPENSE_APPROVED = 'EXPENSE_APPROVED',
  EXPENSE_REJECTED = 'EXPENSE_REJECTED',
  EXPENSE_AUTO_APPROVED = 'EXPENSE_AUTO_APPROVED',
  USER_CREATED = 'USER_CREATED',
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'DUPLICATE_UNIT'
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_STATUS'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'RATE_LIMIT'
  | 'DASHBOARD_ONLY_PENGURUS'
  | 'INTERNAL_ERROR';
