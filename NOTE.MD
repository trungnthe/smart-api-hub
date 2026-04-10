// Thiết kế database trực tiếp trong prisma/schema.prisma

// Mỗi khi sửa đổi cấu trúc trong file prisma/schema.prisma, chạy lệnh sau để tạo migration và cập nhật database:
npx prisma migrate dev --name <tên-migration>

// Mỗi khi cấu trúc schema thay đổi hoặc database cập nhật, bạn cần chạy lệnh này để Prisma tạo lại các kiểu dữ liệu (Types) tương ứng:
npx prisma generate

// Chạy lệnh sau để seed dữ liệu vào database từ file schema.json:
npx prisma db seed

// Lệnh tắt kết hợp (nếu cấu hình trong package.json):
npm run db:init
npm run db:reset
