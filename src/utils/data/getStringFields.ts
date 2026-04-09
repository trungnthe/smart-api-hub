import { Prisma } from "@prisma/client";

export const getStringFields = (resource: string): string[] => {
  const model = Prisma.dmmf.datamodel.models.find(
    (m) => m.name.toLowerCase() === resource.toLowerCase(),
  );
  if (!model) return [];

  return model.fields
    .filter((f) => f.type === 'String' && f.kind !== 'object')
    .map((f) => f.name);
};
