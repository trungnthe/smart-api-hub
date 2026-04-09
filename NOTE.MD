// Để tạo schema từ schema.json, chạy lệnh sau
npx ts-node src/data/schemaGenenerator.ts

// Mỗi khi sửa bất kỳ dấu phẩy nào trong file schema.prisma, bạn BẮT BUỘC phải chạy lệnh này để
//Prisma tạo lại các kiểu dữ liệu (Types) tương ứng:
npx prisma generate

// Sau khi tạo xong schema, chạy lệnh sau để tạo migration và cập nhật database
npx prisma migrate dev --name init

// Sau khi đã có migration, chạy lệnh sau để seed dữ liệu vào database
npx prisma db seed
