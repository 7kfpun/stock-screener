const normalizeBase = (base) => {
  if (!base) return '/';
  return base.endsWith('/') ? base : `${base}/`;
};

const DATA_BASE_URL = `${normalizeBase(import.meta.env.BASE_URL)}data/`;

export const buildDataUrl = (filename) => `${DATA_BASE_URL}${filename}`;

// CSV Parser
export function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split('\t').map(h => h.trim());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split('\t');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index].trim() : '';
    });
    data.push(row);
  }

  return data;
}

// Load stock data
export async function loadStockData(filename = 'latest.csv') {
  const response = await fetch(buildDataUrl(filename));
  if (!response.ok) throw new Error('Failed to load data');

  const csvText = await response.text();
  return parseCSV(csvText);
}
