interface CsvRow {
  query: string;
  category: string;
  group: string;
  isRepresentative: boolean;
  page: string;
}

/**
 * Generates CSV content from categorized query data.
 */
export function generateCsv(rows: CsvRow[]): string {
  const header = 'Запрос,Категория,Группа,Репрезентативный,Страница';
  const lines = rows.map((row) => {
    const escapedQuery = `"${row.query.replace(/"/g, '""')}"`;
    const escapedCategory = `"${(row.category || '').replace(/"/g, '""')}"`;
    const escapedGroup = `"${row.group.replace(/"/g, '""')}"`;
    const escapedPage = `"${(row.page || '').replace(/"/g, '""')}"`;
    return `${escapedQuery},${escapedCategory},${escapedGroup},${row.isRepresentative ? 'Да' : 'Нет'},${escapedPage}`;
  });

  // BOM for Excel to recognize UTF-8
  return '\ufeff' + header + '\n' + lines.join('\n');
}
