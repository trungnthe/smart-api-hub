import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/error/appError';

const ALLOWED_RESOURCES = ['users', 'products', 'orders', 'docs'];

export const checkTable = (
  req: Request<{ resource: string }>,
  res: Response,
  next: NextFunction,
) => {
  const { resource } = req.params;

  if (!ALLOWED_RESOURCES.includes(resource)) {
    return next(
      new AppError(
        "Bảng '${resource}' không tồn tại, vui lòng thử bảng khác !",
        404,
      ),
    );
  }
  next();
};
