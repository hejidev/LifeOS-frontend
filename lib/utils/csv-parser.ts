/**
 * CSV Parser for bulk product import
 * Handles CSV parsing with validation and error handling
 */

export interface CSVRow {
  [key: string]: string;
}

export interface ParseResult {
  data: CSVRow[];
  headers: string[];
  errors: string[];
}

/**
 * Parse CSV string into array of objects
 * @param csvText - CSV string to parse
 * @returns ParseResult with data, headers, and errors
 */
export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  const errors: string[] = [];
  const data: CSVRow[] = [];
  
  if (lines.length === 0) {
    return { data: [], headers: [], errors: ['CSV file is empty'] };
  }

  // Parse headers from first line
  const headers = parseCSVLine(lines[0]);
  
  // Validate required headers
  const requiredHeaders = ['name', 'price'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    // Skip rows with incorrect column count
    if (values.length !== headers.length) {
      errors.push(`Row ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
      continue;
    }

    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    data.push(row);
  }

  return { data, headers, errors };
}

/**
 * Parse a single CSV line
 * Handles quoted fields and escaped quotes
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Validate product data from CSV
 * @param product - Product object to validate
 * @returns Validation result with isValid flag and errors
 */
export function validateProduct(product: CSVRow): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate required fields
  if (!product.name || product.name.trim() === '') {
    errors.push('Product name is required');
  }
  
  if (!product.price || product.price.trim() === '') {
    errors.push('Price is required');
  } else {
    const price = parseFloat(product.price);
    if (isNaN(price) || price <= 0) {
      errors.push('Price must be a positive number');
    }
  }
  
  // Validate stock if provided
  if (product.stock && product.stock.trim() !== '') {
    const stock = parseInt(product.stock);
    if (isNaN(stock) || stock < 0) {
      errors.push('Stock must be a non-negative integer');
    }
  }
  
  // Validate lowStockAt if provided
  if (product.lowStockAt && product.lowStockAt.trim() !== '') {
    const lowStockAt = parseInt(product.lowStockAt);
    if (isNaN(lowStockAt) || lowStockAt < 0) {
      errors.push('Low stock threshold must be a non-negative integer');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate CSV template for product import
 * @returns CSV string with template data
 */
export function generateProductTemplate(): string {
  const headers = ['name', 'price', 'stock', 'cost', 'barcode', 'sku', 'category', 'lowStockAt'];
  const sampleData = [
    'Sample Product 1,1000,50,800,BARCODE001,SKU001,Electronics,3',
    'Sample Product 2,2500,30,2000,BARCODE002,SKU002,Fashion,5',
    'Sample Product 3,500,100,400,BARCODE003,SKU003,Food,10',
  ];
  
  return [headers.join(','), ...sampleData].join('\n');
}