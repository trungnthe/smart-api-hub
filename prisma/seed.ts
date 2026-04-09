import * as fs from 'fs';
import * as path from 'path';
import { prisma } from './prisma';

async function main() {
  const filePath = path.join(__dirname, '../schema.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  console.log('--- 🗑️  Đang dọn dẹp và Reset bộ đếm ---');
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "users", "products", "orders" RESTART IDENTITY CASCADE;`,
  );

  const seedTable = async (
    tableName: string,
    records: any[],
    dateField: string = 'updated_at',
  ) => {
    if (records) {
      await (prisma as any)[tableName].createMany({
        data: records.map((item: any) => {
          const { id, ...rest } = item;
          return {
            ...rest,
            [dateField]: new Date(item[dateField]),
          };
        }),
      });
      console.log(`✅ Đã nạp ${records.length} bản ghi vào bảng ${tableName}.`);
    }
  };

  await seedTable('users', data.users);
  await seedTable('products', data.products);
  await seedTable('orders', data.orders, 'order_date');

  console.log('--- 🚀 Hoàn thành Seed dữ liệu! ---');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
