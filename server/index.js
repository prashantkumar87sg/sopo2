const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.toLowerCase().endsWith('.xls') ||
        file.originalname.toLowerCase().endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Helper function to parse Excel file
function parseExcelFile(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    return { headers, rows };
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error.message}`);
  }
}

// Helper function to find column index by name (case-insensitive)
function findColumnIndex(headers, columnName) {
  return headers.findIndex(header => 
    header && header.toString().toLowerCase().includes(columnName.toLowerCase())
  );
}

// Helper function to extract item data from Sales Order (starts row 17, item code in A, quantity in M, price in O)
function extractSalesOrderData(rows) {
  const items = [];
  
  // Note: rows parameter already has header row removed by parseExcelFile
  // So row 17 in Excel becomes index 15 in the rows array (17 - 2 = 15)
  // Sales order data starts from row 17 (index 15 after header removal)
  for (let i = 15; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || row[0].toString().trim() === '') {
      break; // Stop when column A is blank
    }
    
    const itemCode = row[0] ? row[0].toString().trim() : '';
    const quantity = row[12] ? parseFloat(row[12]) : 0; // Column M (index 12)
    const price = row[14] ? parseFloat(row[14]) : 0; // Column O (index 14)
    
    if (itemCode && !isNaN(quantity)) {
      items.push({
        itemCode,
        quantity,
        price,
        rowNumber: i + 2, // +2 because Excel rows are 1-indexed and header was removed
        type: 'sales'
      });
    }
  }
  
  return items;
}

// Helper function to extract item data from Purchase Order (starts row 16, item code in B, quantity in H, price in I)
function extractPurchaseOrderData(rows) {
  const items = [];
  
  // Note: rows parameter already has header row removed by parseExcelFile
  // So row 16 in Excel becomes index 14 in the rows array (16 - 2 = 14)
  // Purchase order data starts from row 16 (index 14 after header removal)
  for (let i = 14; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1] || row[1].toString().trim() === '') {
      break; // Stop when column B is blank
    }
    
    const itemCode = row[1] ? row[1].toString().trim() : '';
    const quantity = row[7] ? parseFloat(row[7]) : 0; // Column H (index 7)
    const price = row[8] ? parseFloat(row[8]) : 0; // Column I (index 8)
    
    // Skip rows where column B contains "total" (case insensitive)
    if (itemCode && itemCode.toLowerCase().includes('total')) {
      continue;
    }
    
    if (itemCode && !isNaN(quantity)) {
      items.push({
        itemCode,
        quantity,
        price,
        rowNumber: i + 2, // +2 because Excel rows are 1-indexed and header was removed
        type: 'purchase'
      });
    }
  }
  
  return items;
}

// Reconciliation logic
function reconcileOrders(salesOrderItems, purchaseOrderItems) {
  const reconciliation = {
    matched: [],
    missingInPurchase: [],
    quantityMismatches: [],
    extraInPurchase: [],
    summary: {
      totalSalesItems: salesOrderItems.length,
      totalPurchaseItems: purchaseOrderItems.length,
      matchedItems: 0,
      missingItems: 0,
      quantityMismatches: 0,
      extraItems: 0,
      grossProfit: 0
    }
  };

  // Create maps for easier lookup
  const salesMap = new Map();
  const purchaseMap = new Map();

  // Populate sales map
  salesOrderItems.forEach(item => {
    const key = item.itemCode;
    if (salesMap.has(key)) {
      salesMap.get(key).quantity += item.quantity;
    } else {
      salesMap.set(key, { ...item });
    }
  });

  // Populate purchase map
  purchaseOrderItems.forEach(item => {
    const key = item.itemCode;
    if (purchaseMap.has(key)) {
      purchaseMap.get(key).quantity += item.quantity;
    } else {
      purchaseMap.set(key, { ...item });
    }
  });

  // Check each sales item against purchase items
  for (const [itemCode, salesItem] of salesMap) {
    if (purchaseMap.has(itemCode)) {
      const purchaseItem = purchaseMap.get(itemCode);
      if (salesItem.quantity === purchaseItem.quantity) {
        const profit = (salesItem.price - purchaseItem.price) * salesItem.quantity;
        reconciliation.matched.push({
          salesItemCode: salesItem.itemCode,
          purchaseItemCode: purchaseItem.itemCode,
          salesQuantity: salesItem.quantity,
          purchaseQuantity: purchaseItem.quantity,
          salesPrice: salesItem.price,
          purchasePrice: purchaseItem.price,
          profit: profit,
          status: 'Matched'
        });
        reconciliation.summary.matchedItems++;
        reconciliation.summary.grossProfit += profit;
      } else {
        reconciliation.quantityMismatches.push({
          salesItemCode: salesItem.itemCode,
          purchaseItemCode: purchaseItem.itemCode,
          salesQuantity: salesItem.quantity,
          purchaseQuantity: purchaseItem.quantity,
          difference: purchaseItem.quantity - salesItem.quantity,
          status: 'Quantity Mismatch'
        });
        reconciliation.summary.quantityMismatches++;
      }
    } else {
      reconciliation.missingInPurchase.push({
        itemCode,
        salesQuantity: salesItem.quantity,
        status: 'Missing in Purchase Orders'
      });
      reconciliation.summary.missingItems++;
    }
  }

  // Find items in purchase orders that are not in sales orders
  for (const [itemCode, purchaseItem] of purchaseMap) {
    if (!salesMap.has(itemCode)) {
      reconciliation.extraInPurchase.push({
        itemCode,
        purchaseQuantity: purchaseItem.quantity,
        status: 'Extra in Purchase Orders'
      });
      reconciliation.summary.extraItems++;
    }
  }

  return reconciliation;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Reconciliation API is running' });
});

// Manual reconciliation endpoint
app.post('/api/manual-reconcile', (req, res) => {
  try {
    const { salesItemCode, purchaseItemCode, salesQuantity, purchaseQuantity, salesPrice, purchasePrice } = req.body;
    
    if (!salesItemCode || !purchaseItemCode) {
      return res.status(400).json({ error: 'Both sales and purchase item codes are required' });
    }
    
    // Calculate profit
    const profit = ((salesPrice || 0) - (purchasePrice || 0)) * (salesQuantity || 0);
    
    // Create manual mapping entry
    const manualMapping = {
      salesItemCode,
      purchaseItemCode,
      salesQuantity: salesQuantity || 0,
      purchaseQuantity: purchaseQuantity || 0,
      salesPrice: salesPrice || 0,
      purchasePrice: purchasePrice || 0,
      profit: profit,
      status: 'manually_matched'
    };
    
    res.json({
      success: true,
      manualMapping,
      message: 'Items manually reconciled successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error processing manual reconciliation' });
  }
});

// Upload and reconcile files
app.post('/api/reconcile', upload.fields([
  { name: 'salesOrder', maxCount: 1 },
  { name: 'purchaseOrders', maxCount: 10 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.salesOrder || !req.files.purchaseOrders) {
      return res.status(400).json({ 
        error: 'Both Sales Order and at least one Purchase Order file are required' 
      });
    }

    // Parse Sales Order file
    const salesOrderFile = req.files.salesOrder[0];
    const salesOrderData = parseExcelFile(salesOrderFile.path);
    const salesOrderItems = extractSalesOrderData(salesOrderData.rows);

    // Parse all Purchase Order files
    const allPurchaseOrderItems = [];
    const purchaseOrderDetails = [];
    
    for (const purchaseOrderFile of req.files.purchaseOrders) {
      const purchaseOrderData = parseExcelFile(purchaseOrderFile.path);
      const purchaseOrderItems = extractPurchaseOrderData(purchaseOrderData.rows);
      
      allPurchaseOrderItems.push(...purchaseOrderItems);
      purchaseOrderDetails.push({
        fileName: purchaseOrderFile.originalname,
        items: purchaseOrderItems
      });
    }

    // Perform reconciliation
    const reconciliation = reconcileOrders(salesOrderItems, allPurchaseOrderItems);

    // Clean up uploaded files
    const fs = require('fs');
    [salesOrderFile, ...req.files.purchaseOrders].forEach(file => {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    });

    res.json({
      success: true,
      reconciliation,
      extractedData: {
        salesOrder: {
          fileName: salesOrderFile.originalname,
          items: salesOrderItems
        },
        purchaseOrders: purchaseOrderDetails
      }
    });

  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ 
      error: error.message || 'An error occurred during reconciliation' 
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});