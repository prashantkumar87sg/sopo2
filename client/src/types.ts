export interface ExtractedItem {
  itemCode: string;
  quantity: number;
  price: number;
  rowNumber: number;
  type: 'sales' | 'purchase';
}

export interface ReconciliationData {
  reconciliation: {
    matched: Array<{
      salesItemCode: string;
      purchaseItemCode: string;
      salesQuantity: number;
      purchaseQuantity: number;
      salesPrice: number;
      purchasePrice: number;
      profit: number;
      status: string;
    }>;
    missingInPurchase: Array<{
      itemCode: string;
      salesQuantity: number;
      status: string;
    }>;
    quantityMismatches: Array<{
      salesItemCode: string;
      purchaseItemCode: string;
      salesQuantity: number;
      purchaseQuantity: number;
      difference: number;
      status: string;
    }>;
    extraInPurchase: Array<{
      itemCode: string;
      purchaseQuantity: number;
      status: string;
    }>;
    summary: {
      totalSalesItems: number;
      totalPurchaseItems: number;
      matchedItems: number;
      missingItems: number;
      quantityMismatches: number;
      extraItems: number;
      grossProfit: number;
    };
  };
  extractedData: {
    salesOrder: {
      fileName: string;
      items: ExtractedItem[];
    };
    purchaseOrders: Array<{
      fileName: string;
      items: ExtractedItem[];
    }>;
  };
}

export interface ManualMapping {
  salesItemCode: string;
  purchaseItemCode: string;
  salesQuantity: number;
  purchaseQuantity: number;
  salesPrice: number;
  purchasePrice: number;
  profit: number;
  status: 'manually_matched';
}

export interface BulkManualMapping {
  salesItemCodes: string[];
  purchaseItemCodes: string[];
  mappings: Array<{
    salesItemCode: string;
    purchaseItemCode: string;
    salesQuantity: number;
    purchaseQuantity: number;
  }>;
}

export interface ReconciliationItem {
  itemCode: string;
  quantity: number;
  type: 'missing' | 'extra' | 'mismatch';
  originalData?: any;
}
