import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../prisma/prisma';
import { AppError } from '../utils/error/appError';
import { getStringFields } from '../utils/data/getStringFields';

// * GET /:resource - Đọc bản ghi
// * GET /:resource - Đọc bản ghi
/**
 * @openapi
 * /{resource}:
 *   get:
 *     tags:
 *       - Dynamic CRUD
 *     summary: Lấy danh sách bản ghi
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *         example: products
 *       - in: query
 *         name: _page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: _limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: _sort
 *         schema:
 *           type: string
 *       - in: query
 *         name: _order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *       - in: query
 *         name: _fields
 *         schema:
 *           type: string
 *         description: "Ví dụ: id,name,email"
 *       - in: query
 *         name: _expand
 *         schema:
 *           type: string
 *       - in: query
 *         name: _embed
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Full text search
 *     responses:
 *       200:
 *         description: Thành công
 *       401:
 *         description: Chưa xác thực
 */
export async function getAll(
  req: Request<{ resource: string; _fields: string }>,
  res: Response,
  next: NextFunction,
) {
  const { resource } = req.params;

  // Bóc tách TẤT CẢ các tham số hệ thống ra khỏi filters
  const {
    _page,
    _limit,
    _sort,
    _order,
    _fields,
    _expand,
    _embed,
    q,
    ...filters
  } = req.query;

  // 1. Cấu hình phân trang
  const page = Number(_page) || 1;
  const limit = Number(_limit) || 10;
  const skip = (page - 1) * limit;

  // 2. Cấu hình sắp xếp
  const orderBy: Record<string, string> = {};
  if (_sort && typeof _sort === 'string') {
    orderBy[_sort] =
      (_order as string)?.toLowerCase() === 'desc' ? 'desc' : 'asc';
  } else orderBy['id'] = 'asc';

  // 3. Cấu hình bộ lọc (where)
  const where: Record<string, any> = {};

  // Xử lý Full Text Search (q)
  if (q && typeof q === 'string') {
    const stringFields = getStringFields(resource);
    if (stringFields.length > 0) {
      where.OR = stringFields.map((field) => ({
        [field]: { contains: q, mode: 'insensitive' },
      }));
    }
  }

  // Duyệt qua filters (lúc này filters đã SẠCH, không còn _fields, _limit...)
  Object.keys(filters).forEach((key) => {
    const val = filters[key] as string;
    if (!val) return;

    const formatValue = (v: string) => (isNaN(Number(v)) ? v : Number(v));

    if (key.endsWith('_gte')) {
      const field = key.replace('_gte', '');
      where[field] = { ...where[field], gte: formatValue(val) };
    } else if (key.endsWith('_lte')) {
      const field = key.replace('_lte', '');
      where[field] = { ...where[field], lte: formatValue(val) };
    } else if (key.endsWith('_ne')) {
      const field = key.replace('_ne', '');
      where[field] = { ...where[field], not: formatValue(val) };
    } else if (key.endsWith('_like')) {
      const field = key.replace('_like', '');
      where[field] = { ...where[field], contains: val, mode: 'insensitive' };
    } else {
      // Chỉ lọc nếu không phải tham số hệ thống (đề phòng trường hợp hi hữu)
      if (!key.startsWith('_')) {
        where[key] = formatValue(val);
      }
    }
  });

  // 4. XỬ LÝ TÁCH BIỆT INCLUDE VÀ SELECT (Giữ nguyên logic của bạn)
  let include: any = undefined;
  let select: any = undefined;

  if (
    (_expand && typeof _expand === 'string') ||
    (_embed && typeof _embed === 'string')
  ) {
    include = {};
    const processInclude = (param: string) => {
      param.split(',').forEach((f) => {
        if (f.trim()) include[f.trim()] = true;
      });
    };
    if (_expand) processInclude(_expand as string);
    if (_embed) processInclude(_embed as string);
  } else if (_fields && typeof _fields === 'string') {
    select = _fields.split(',').reduce((obj: any, f) => {
      if (f.trim()) obj[f.trim()] = true;
      return obj;
    }, {});
  }

  const finalInclude =
    include && Object.keys(include).length > 0 ? include : undefined;

  // 5. Thực thi truy vấn
  const [data, total] = await Promise.all([
    (prisma as any)[resource].findMany({
      where,
      include: finalInclude,
      select: finalInclude ? undefined : select,
      skip,
      take: limit,
      orderBy,
    }),
    (prisma as any)[resource].count({ where }),
  ]);

  // 6. Response...
  res.setHeader('X-Total-Count', total.toString());
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
  return res.status(200).json({
    message: `Lấy danh sách ${resource} thành công`,
    pagination: { page, limit, total, totalPage: Math.ceil(total / limit) },
    metadata: data,
  });
}

// * POST /:resource - Tạo mới bản ghi
/**
 * @openapi
 * /{resource}:
 *   post:
 *     tags:
 *       - Dynamic CRUD
 *     summary: Tạo mới bản ghi
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Tạo mới thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
export async function create(
  req: Request<{ resource: string }>,
  res: Response,
  next: NextFunction,
) {
  const { resource } = req.params;

  const { id, ...createData } = req.body;

  if (Object.keys(createData).length === 0) {
    return next(new AppError('Dữ liệu tạo mới không được để trống', 400));
  }

  const data = await (prisma as any)[resource].create({
    data: createData,
  });

  return res.status(201).json({
    message: 'Tạo mới thành công',
    metadata: data,
  });
}

/**
 * @openapi
 * /{resource}/{id}:
 *   patch:
 *     tags:
 *       - Dynamic CRUD
 *     summary: Cập nhật một phần bản ghi
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
export const updatePatch = async (
  req: Request<{ resource: string; id: string }>,
  res: Response,
  next: NextFunction,
) => {
  const { resource, id } = req.params;

  const data = await (prisma as any)[resource].update({
    where: { id: Number(id) },
    data: { ...req.body },
  });

  res.json({
    message: 'Cập nhật một phần thành công (PATCH)',
    metadata: data,
  });
};

/**
 * @openapi
 * /{resource}/{id}:
 *   put:
 *     tags:
 *       - Dynamic CRUD
 *     summary: Thay thế toàn bộ bản ghi
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
export const updatePut = async (
  req: Request<{ resource: string; id: string }>,
  res: Response,
  next: NextFunction,
) => {
  const { resource, id } = req.params;

  // Tìm bản ghi cũ để biết cấu trúc hoặc kiểm tra tồn tại
  const existingRecord = await (prisma as any)[resource].findUnique({
    where: { id: Number(id) },
  });

  if (!existingRecord) {
    return next(new AppError('Không tìm thấy bản ghi để update', 404));
  }

  const data = await (prisma as any)[resource].update({
    where: { id: Number(id) },
    data: {
      ...req.body,
    },
  });

  res.json({
    message: 'Thay thế toàn bộ thành công (PUT)',
    metadata: data,
  });
};

/**
 * @openapi
 * /{resource}/{id}:
 *   delete:
 *     tags:
 *       - Dynamic CRUD
 *     summary: Xóa bản ghi (Chỉ Admin)
 *     parameters:
 *       - in: path
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       403:
 *         description: Không có quyền xóa
 *       404:
 *         description: Không tìm thấy bản ghi
 */
export const remove = async (
  req: Request<{ resource: string; id: string }> & { user?: any },
  res: Response,
  next: NextFunction,
) => {
  const { resource, id } = req.params;
  const numericId = Number(id);

  // Kiểm tra quyền admin
  const user = (req as any).user;
  if (!user || user.role !== 1) {
    return next(
      new AppError('Bạn không có quyền xóa. Chỉ admin mới được phép!', 403),
    );
  }

  if (isNaN(numericId)) {
    return next(new AppError('ID phải là một số hợp lệ', 400));
  }

  // Kiểm tra bản ghi có tồn tại trước khi xóa không
  const item = await (prisma as any)[resource].findUnique({
    where: { id: numericId },
  });

  if (!item) {
    return next(
      new AppError(`Không tìm thấy bản ghi với ID ${id} để xóa`, 404),
    );
  }

  await (prisma as any)[resource].delete({
    where: { id: numericId },
  });

  res.status(200).json({
    message: `Xóa bản ghi khỏi '${resource}' thành công`,
  });
};
