import { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../prisma/prisma';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/error/appError';
import { config } from '../config';

const SECRET_KEY = config.SECRET_KEY;

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng nhập
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: a.nguyen@example.com
 *               password:
 *                 type: string
 *                 example: hashed_password_1
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       400:
 *         description: Sai email hoặc mật khẩu
 *       404:
 *         description: Không tìm thấy người dùng
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Email hoặc mật khẩu không chính xác', 400));
  }

  const user = await prisma.users.findFirst({
    where: { email },
    select: { id: true, email: true, password: true, role: true, name: true },
  });

  if (!user) {
    return next(new AppError('Email hoặc mật khẩu không chính xác', 404));
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return next(new AppError('Email hoặc mật khẩu không chính xác', 400));
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET_KEY,
    {
      expiresIn: '1d',
    },
  );

  res.json({
    message: 'Đăng nhập thành công',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Đăng ký người dùng mới
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: number
 *                 description: "1: Admin, 2: User"
 *                 example: 2
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Email đã tồn tại hoặc thiếu thông tin
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { email, password, name, role } = req.body;

  if (!email || !password || !name) {
    return next(
      new AppError('Vui lòng cung cấp đầy đủ email, mật khẩu và tên!', 400),
    );
  }

  const existingUser = await prisma.users.findFirst({
    where: { email },
  });

  if (existingUser) {
    return next(new AppError('Tên đăng nhập đã tồn tại!', 400));
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = await prisma.users.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: typeof role === 'number' ? role : 2,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  res.status(201).json({
    message: 'Đăng ký thành công',
    user: newUser,
  });
}
