export function defineType(val: any): string {
  if (typeof val === 'number') return val % 1 !== 0 ? 'Float' : 'Int';

  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num)) return num % 1 !== 0 ? 'Float' : 'Int';

    const date = Date.parse(val);
    if (!isNaN(date)) return 'DateTime';
  }

  if (typeof val === 'boolean') return 'Boolean';

  return 'String';
}
