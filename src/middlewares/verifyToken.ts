import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error/appError';
import { config } from '../config';

const SECRET_KEY = config.SECRET_KEY;

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  let token = '';

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return next(
      new AppError('Bạn cần đăng nhập để thực hiện thao tác này!', 401),
    );
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.log(`[Auth] Verification failed: ${err.message}`);
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
