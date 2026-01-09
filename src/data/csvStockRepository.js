import { createStockCollection } from '../domain/stock/stock.js';

const normalizeBase = (base) => {
  if (!base) return '/';
  return base.endsWith('/') ? base : `${base}/`;
};

const DATA_BASE_URL = `${normalizeBase(import.meta.env.BASE_URL)}data/`;

export const buildDataUrl = (filename) => `${DATA_BASE_URL}${filename}`;

const parseCsvText = (csvText) => {
  const lines = csvText.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return [];

  const headers = lines[0].split('\t').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = lines[i].split('\t');
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index].trim() : '';
    });

    rows.push(row);
  }

  return rows;
};

const fetchText = async (path) => {
  const response = await fetch(buildDataUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.text();
};

export async function fetchStockSnapshots(date = 'latest') {
  const filename = date === 'latest' ? 'latest.csv' : `${date}.csv`;
  const csvText = await fetchText(filename);
  const rows = parseCsvText(csvText);
  return createStockCollection(rows);
}

export async function fetchStockSummary(date = 'latest') {
  const filename = date === 'latest' ? 'latest.json' : `${date}.json`;
  try {
    const response = await fetch(`${DATA_BASE_URL}summary/${filename}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.warn('Failed to load summary:', err);
    return null;
  }
}

export async function fetchAvailableDates(limit = 50) {
  const csvText = await fetchText('dates.csv');
  const dates = csvText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return limit > 0 ? dates.slice(0, limit) : dates;
}
