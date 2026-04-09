import { NextFunction, Request, Response } from 'express';
import { ZodObject, ZodError } from 'zod';
import { AppError } from '../utils/error/appError';

export const validate = (schema: ZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((i) => i.message).join(', ');
        return next(new AppError(`Zod: ${message}`, 400));
      }
      next(error);
    }
  };
};
