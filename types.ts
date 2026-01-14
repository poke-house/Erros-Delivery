export interface OrderError {
  orderNumber: string;
  restaurantName: string;
  date: string;
  time: string;
  customerName: string;
  platform: 'Glovo' | 'Uber Eats' | 'Bolt' | 'Unknown';
}

export interface ExtractedFileResult {
  fileName: string;
  status: 'processing' | 'success' | 'error';
  orders: OrderError[];
  errorMessage?: string;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}