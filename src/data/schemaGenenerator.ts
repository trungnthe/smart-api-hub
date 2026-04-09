import * as fs from 'fs';
import { defineType } from '../utils/data/defineType';

const data = JSON.parse(fs.readFileSync('./schema.json', 'utf-8'));

let schema = `
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
`;

const tableNames = Object.keys(data);

for (const [tableName, records] of Object.entries(data)) {
  const fields = (records as any[])[0];
  if (!fields) continue;

  schema += `\nmodel ${tableName} {\n`;
  schema += `  id    Int    @id @default(autoincrement())\n`;

  let relations = '';

  for (const [key, value] of Object.entries(fields)) {
    if (key === 'id') continue;

    let type = defineType(value);

    // Custom logic cho kiểu số thực
    if (key.includes('price') || key.includes('amount')) {
      type = 'Float';
    }

    // --- XỬ LÝ QUAN HỆ ---
    if (key.endsWith('_id')) {
      const targetTable = key.replace('_id', 's');

      // Tìm bảng tương ứng (số nhiều hoặc số ít)
      const matchedTable = tableNames.find(
        (t) =>
          t.toLowerCase() === targetTable.toLowerCase() ||
          t.toLowerCase() === (targetTable + 's').toLowerCase(),
      );

      if (matchedTable) {
        schema += `  ${key}  Int\n`;
        const relationFieldName = targetTable;
        schema += `  ${relationFieldName}  ${matchedTable}  @relation(fields: [${key}], references: [id], onDelete: Cascade)\n`;
        continue;
      }
    }

    const updatedAt = key === 'updated_at' ? ' @updatedAt' : '';
    const defaultValue = key === 'created_at' ? ' @default(now())' : '';

    schema += `  ${key}  ${type}${defaultValue}${updatedAt}\n`;
  }

  // Logic bổ sung: Kiểm tra xem có bảng nào khác trỏ tới bảng này không để thêm mảng quan hệ ngược
  tableNames.forEach((otherTable) => {
    if (otherTable === tableName) return;
    const otherFields = (data[otherTable] as any[])[0];
    for (const key of Object.keys(otherFields)) {
      if (
        key === `${tableName.replace(/s$/, '')}_id` ||
        key === `${tableName}_id`
      ) {
        schema += `  ${otherTable}  ${otherTable}[]\n`;
      }
    }
  });

  schema += `}\n`;
}

fs.writeFileSync('./prisma/schema.prisma', schema);
console.log('✅ Generated schema with Relations successfully!');
