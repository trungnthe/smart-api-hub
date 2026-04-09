import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/server';

let token = '';

beforeAll(async () => {
  // Đăng ký tài khoản test
  await request(app).post('/auth/register').send({
    name: 'Test User2',
    email: 'testcase2@example.com',
    password: '123456',
  });

  // Đăng nhập để lấy token
  const res = await request(app).post('/auth/login').send({
    email: 'testcase2@example.com',
    password: '123456',
  });

  token = res.body.token;
});

describe('Resource API', () => {
  // 1. Kiểm tra lấy danh sách (Happy Path)
  it('GET /users - 200', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.metadata)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  // 2. Kiểm tra bảo mật: Không có token
  it('GET /users - 401 (no token)', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
  });

  // 3. Kiểm tra bảo mật: Token không hợp lệ
  it('GET /users - 401 (invalid token)', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', 'Bearer invalid_token_here');
    expect(res.status).toBe(401);
  });

  // 4. Kiểm tra Resource không tồn tại (Sử dụng model lạ trong Prisma)
  it('GET /notfound - 404 hoặc 500', async () => {
    const res = await request(app)
      .get('/notfound')
      .set('Authorization', `Bearer ${token}`);
    expect([404, 500]).toContain(res.status);
  });

  // 5. Kiểm tra tạo mới Resource (Happy Path)
  it('POST /products - 201', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Sản phẩm Test',
        price: 99000,
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.metadata).toBeDefined();
    expect(res.body.metadata.title).toBe('Sản phẩm Test');
  });

  // 6. Kiểm tra Validation: POST thiếu dữ liệu
  it('POST /products - 400 khi body trống', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${token}`)
      .send({}); // Gửi object rỗng

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('không được để trống');
  });

  // 7. Kiểm tra Cập nhật (PUT) - Resource không tồn tại
  it('PUT /users/999999 - 404', async () => {
    const res = await request(app)
      .put('/users/999999')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(404);
  });

  // 8. Kiểm tra Xóa (DELETE) - Happy Path (giả định xóa chính mình hoặc id 1)
  it('DELETE /users/888888 - 404', async () => {
    const res = await request(app)
      .delete('/users/888888')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  // 9. Kiểm tra Phân trang (Pagination)
  it('GET /users?_page=1&_limit=2 - 200 và trả về đúng metadata', async () => {
    const res = await request(app)
      .get('/users?_page=1&_limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.headers['x-total-count']).toBeDefined();
    expect(res.body.metadata.length).toBeLessThanOrEqual(2);
  });

  // 10. Kiểm tra Lọc dữ liệu (Filtering với _like)
  it('GET /users?name_like=Test - 200 và lọc đúng kết quả', async () => {
    const res = await request(app)
      .get('/users?name_like=Test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.metadata)).toBe(true);

    const allMatch = res.body.metadata.every((user: any) =>
      user.name.toLowerCase().includes('test'),
    );
    expect(allMatch).toBe(true);
  });
});
