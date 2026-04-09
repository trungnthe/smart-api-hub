import "dotenv/config";
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error/appError';

const SECRET_KEY = process.env.JWT_SECRET || process.env.SECRET_KEY || 'your_super_secret_key_123';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(
      new AppError('Bạn cần đăng nhập để thực hiện thao tác này!', 401),
    );
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'
          : 'Token không hợp lệ';

      return next(new AppError(message, 401));
    }

    req.user = decoded;
    next();
  });
};
