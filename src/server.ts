import express, { NextFunction, Request, Response } from 'express';
import { prisma } from '../prisma/prisma';
import { checkTable } from './middlewares/checkTable';
import {
  create,
  getAll,
  remove,
  updatePatch,
  updatePut,
} from './controllers/resource.controller';
import { checkField } from './middlewares/checkField';
import { verifyToken } from './middlewares/verifyToken';
import { login, register } from './controllers/auth.controller';
import { globalErrorHandler } from './middlewares/error.middleware';
import { AppError } from './utils/error/appError';
import { catchAsync } from './utils/error/catchAsync';
import { validate } from './middlewares/validate.middleware';
import {
  loginSchema,
  registerSchema,
} from './utils/validation/auth.validation';
import { rateLimiter } from './middlewares/rateLimit.middleware';
import swaggerDocs from './utils/swagger';
import { config } from './config';

const PORT = config.PORT;

const app = express();

swaggerDocs(app, Number(PORT));

app.use(express.json());

app.use(rateLimiter);

app.get('/', (req, res) => {
  res.send('Hello World');
});

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Kiểm tra sức khỏe hệ thống
 *     description: Trả về trạng thái của ứng dụng và kết nối cơ sở dữ liệu.
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: Ok
 *                 database:
 *                   type: string
 *                   example: Connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Lỗi kết nối cơ sở dữ liệu
 */
app.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'Ok',
      database: 'Connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return next(new AppError('Disconnected!', 500));
  }
});

// Đăng nhập đăng ký
app.post('/auth/login', validate(loginSchema), catchAsync(login));
app.post('/auth/register', validate(registerSchema), catchAsync(register));

// Middleware kiểm tra bảng tồn tại trước khi xử lý các route
app.use('/:resource', checkTable);

// Các route CRUD dynamic cho tất cả các resource
app.get('/:resource', verifyToken, checkField, catchAsync(getAll));
app.post('/:resource', verifyToken, catchAsync(create));
app.put('/:resource/:id', verifyToken, catchAsync(updatePut));
app.patch('/:resource/:id', verifyToken, catchAsync(updatePatch));
app.delete('/:resource/:id', verifyToken, catchAsync(remove));

app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});

export default app;
