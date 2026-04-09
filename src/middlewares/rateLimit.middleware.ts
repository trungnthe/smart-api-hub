import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error/appError';

const WINDOW_MS = 60 * 1000; // 1 phút
const MAX_LIMIT = 100; // 100 requests

const memoryStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let record = memoryStore.get(ip);

  // Nếu chưa có record hoặc đã quá thời gian 1 phút -> Reset record mới
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
  }

  // Tăng số lượt gọi
  record.count++;
  memoryStore.set(ip, record);

  // Tính toán các thông số Header
  const remaining = Math.max(0, MAX_LIMIT - record.count);

  res.setHeader('X-RateLimit-Limit', MAX_LIMIT);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

  // Kiểm tra ngưỡng
  if (record.count > MAX_LIMIT) {
    return next(
      new AppError(
        'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút!',
        429,
      ),
    );
  }

  next();
};

// Xóa các IP cũ định kỳ mỗi 5 phút để tránh Memory Leak
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, data] of memoryStore.entries()) {
      if (now > data.resetTime) memoryStore.delete(ip);
    }
  },
  5 * 60 * 1000,
);
