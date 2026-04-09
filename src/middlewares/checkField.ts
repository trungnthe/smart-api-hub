import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/error/appError';

export const checkField = (req: Request, res: Response, next: NextFunction) => {
  const systemParams = [
    '_page',
    '_limit',
    '_sort',
    '_order',
    '_fields',
    '_expand',
    '_embed',
  ];

  const validOperators = ['_gte', '_lte', '_ne', '_like'];

  const queryKeys = Object.keys(req.query);

  for (const key of queryKeys) {
    if (key === 'q') continue;

    if (key.startsWith('_')) {
      if (!systemParams.includes(key)) {
        return next(
          new AppError(
            `Tham số query '${key}' không hợp lệ. Vui lòng dùng đúng định dạng (ví dụ: _fields=, _sort=)`,
            400,
          ),
        );
      }
      continue;
    }

    if (key.includes('_')) {
      const hasValidOperator = validOperators.some((op) => key.endsWith(op));

      if (!hasValidOperator) {
        return new AppError(
          `Tham số query '${key}' không hợp lệ. Vui lòng dùng đúng định dạng (ví dụ: _gte, _lte, _ne, _like)`,
          400,
        );
      }
    }
  }
  next();
};
