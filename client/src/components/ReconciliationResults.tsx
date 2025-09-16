import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Download, RotateCcw, Eye, EyeOff, Link, ArrowRight, AlertCircle } from 'lucide-react';
import { ReconciliationData, ManualMapping, ReconciliationItem } from '../types';
import axios from 'axios';

interface ReconciliationResultsProps {
  data: ReconciliationData;
  onReset: () => void;
}

const ReconciliationResults: React.FC<ReconciliationResultsProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'matched' | 'missing' | 'mismatches' | 'extra' | 'extracted' | 'manual'>('summary');
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [manualMappings, setManualMappings] = useState<ManualMapping[]>([]);
  const [selectedSalesItems, setSelectedSalesItems] = useState<string[]>([]);
  const [selectedPurchaseItems, setSelectedPurchaseItems] = useState<string[]>([]);
  const [isMapping, setIsMapping] = useState(false);
  const [showCheckboxes, setShowCheckboxes] = useState(false);
  const [quantityValidation, setQuantityValidation] = useState<{
    isValid: boolean;
    message: string;
    totalSalesQty: number;
    totalPurchaseQty: number;
  }>({ isValid: true, message: '', totalSalesQty: 0, totalPurchaseQty: 0 });

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleManualMapping = async () => {
    if (selectedSalesItems.length === 0 || selectedPurchaseItems.length === 0) return;
    
    // Validate quantity balance before proceeding
    if (!validateQuantityBalance(selectedSalesItems, selectedPurchaseItems)) {
      alert('Cannot create mappings: Quantities must match exactly. Please adjust your selections.');
      return;
    }
    
    setIsMapping(true);
    try {
      const newMappings: ManualMapping[] = [];
      
      // Create all possible combinations of selected items
      for (const salesItemCode of selectedSalesItems) {
        for (const purchaseItemCode of selectedPurchaseItems) {
          const salesItem = getAllReconcilableSalesItems().find(item => item.itemCode === salesItemCode);
          const purchaseItem = getAllReconcilablePurchaseItems().find(item => item.itemCode === purchaseItemCode);
          
          if (salesItem && purchaseItem) {
            const response = await axios.post('http://localhost:5001/api/manual-reconcile', {
              salesItemCode,
              purchaseItemCode,
              salesQuantity: salesItem.quantity,
              purchaseQuantity: purchaseItem.quantity,
              salesPrice: salesItem.originalData?.price || 0,
              purchasePrice: purchaseItem.originalData?.price || 0
            });

            if (response.data.success) {
              newMappings.push({
                salesItemCode,
                purchaseItemCode,
                salesQuantity: response.data.manualMapping.salesQuantity,
                purchaseQuantity: response.data.manualMapping.purchaseQuantity,
                salesPrice: response.data.manualMapping.salesPrice,
                purchasePrice: response.data.manualMapping.purchasePrice,
                profit: response.data.manualMapping.profit,
                status: 'manually_matched'
              });
            }
          }
        }
      }
      
      if (newMappings.length > 0) {
        setManualMappings([...manualMappings, ...newMappings]);
        setSelectedSalesItems([]);
        setSelectedPurchaseItems([]);
        setShowCheckboxes(false);
        setQuantityValidation({ isValid: true, message: '', totalSalesQty: 0, totalPurchaseQty: 0 });
      }
    } catch (error) {
      console.error('Error creating manual mappings:', error);
    } finally {
      setIsMapping(false);
    }
  };

  // Validate quantity balance
  const validateQuantityBalance = (salesItems: string[], purchaseItems: string[]) => {
    const salesItemsData = getAllReconcilableSalesItems().filter(item => salesItems.includes(item.itemCode));
    const purchaseItemsData = getAllReconcilablePurchaseItems().filter(item => purchaseItems.includes(item.itemCode));
    
    const totalSalesQty = salesItemsData.reduce((sum, item) => sum + item.quantity, 0);
    const totalPurchaseQty = purchaseItemsData.reduce((sum, item) => sum + item.quantity, 0);
    
    const isValid = totalSalesQty === totalPurchaseQty;
    const message = isValid 
      ? `Quantities match: ${totalSalesQty} = ${totalPurchaseQty}`
      : `Quantities don't match: ${totalSalesQty} ≠ ${totalPurchaseQty}. Please adjust selections.`;
    
    setQuantityValidation({
      isValid,
      message,
      totalSalesQty,
      totalPurchaseQty
    });
    
    return isValid;
  };

  const handleSalesItemToggle = (itemCode: string) => {
    const newSelection = selectedSalesItems.includes(itemCode) 
      ? selectedSalesItems.filter(code => code !== itemCode)
      : [...selectedSalesItems, itemCode];
    
    setSelectedSalesItems(newSelection);
    validateQuantityBalance(newSelection, selectedPurchaseItems);
  };

  const handlePurchaseItemToggle = (itemCode: string) => {
    const newSelection = selectedPurchaseItems.includes(itemCode) 
      ? selectedPurchaseItems.filter(code => code !== itemCode)
      : [...selectedPurchaseItems, itemCode];
    
    setSelectedPurchaseItems(newSelection);
    validateQuantityBalance(selectedSalesItems, newSelection);
  };

  const handleSelectAllSales = () => {
    const allSalesItems = getAllReconcilableSalesItems();
    const allSalesCodes = allSalesItems.map(item => item.itemCode);
    const newSelection = selectedSalesItems.length === allSalesCodes.length ? [] : allSalesCodes;
    
    setSelectedSalesItems(newSelection);
    validateQuantityBalance(newSelection, selectedPurchaseItems);
  };

  const handleSelectAllPurchase = () => {
    const allPurchaseItems = getAllReconcilablePurchaseItems();
    const allPurchaseCodes = allPurchaseItems.map(item => item.itemCode);
    const newSelection = selectedPurchaseItems.length === allPurchaseCodes.length ? [] : allPurchaseCodes;
    
    setSelectedPurchaseItems(newSelection);
    validateQuantityBalance(selectedSalesItems, newSelection);
  };

  // Get filtered items (excluding manually mapped ones)
  const getFilteredMissingItems = () => {
    return data.reconciliation.missingInPurchase.filter(item => 
      !manualMappings.some(mapping => mapping.salesItemCode === item.itemCode)
    );
  };

  const getFilteredQuantityMismatches = () => {
    return data.reconciliation.quantityMismatches.filter(item => 
      !manualMappings.some(mapping => mapping.salesItemCode === item.salesItemCode)
    );
  };

  const getFilteredExtraItems = () => {
    return data.reconciliation.extraInPurchase.filter(item => 
      !manualMappings.some(mapping => mapping.purchaseItemCode === item.itemCode)
    );
  };

  // Get all sales items that can be reconciled (missing + quantity mismatches)
  const getAllReconcilableSalesItems = (): ReconciliationItem[] => {
    const missingItems = getFilteredMissingItems().map(item => {
      // Find the corresponding item in extracted data to get price
      const extractedItem = data.extractedData.salesOrder.items.find(extracted => 
        extracted.itemCode === item.itemCode
      );
      
      return {
        itemCode: item.itemCode,
        quantity: item.salesQuantity,
        type: 'missing' as const,
        originalData: {
          ...item,
          price: extractedItem?.price || 0
        }
      };
    });

    const mismatchItems = getFilteredQuantityMismatches().map(item => {
      // Find the corresponding item in extracted data to get price
      const extractedItem = data.extractedData.salesOrder.items.find(extracted => 
        extracted.itemCode === item.salesItemCode
      );
      
      return {
        itemCode: item.salesItemCode,
        quantity: item.salesQuantity,
        type: 'mismatch' as const,
        originalData: {
          ...item,
          price: extractedItem?.price || 0
        }
      };
    });

    return [...missingItems, ...mismatchItems];
  };

  // Get all purchase items that can be reconciled (extra + quantity mismatches)
  const getAllReconcilablePurchaseItems = (): ReconciliationItem[] => {
    const extraItems = getFilteredExtraItems().map(item => {
      // Find the corresponding item in extracted data to get price
      const extractedItem = data.extractedData.purchaseOrders
        .flatMap(po => po.items)
        .find(extracted => extracted.itemCode === item.itemCode);
      
      return {
        itemCode: item.itemCode,
        quantity: item.purchaseQuantity,
        type: 'extra' as const,
        originalData: {
          ...item,
          price: extractedItem?.price || 0
        }
      };
    });

    const mismatchItems = getFilteredQuantityMismatches().map(item => {
      // Find the corresponding item in extracted data to get price
      const extractedItem = data.extractedData.purchaseOrders
        .flatMap(po => po.items)
        .find(extracted => extracted.itemCode === item.purchaseItemCode);
      
      return {
        itemCode: item.purchaseItemCode,
        quantity: item.purchaseQuantity,
        type: 'mismatch' as const,
        originalData: {
          ...item,
          price: extractedItem?.price || 0
        }
      };
    });

    return [...extraItems, ...mismatchItems];
  };

  const getAllMatchedItems = () => {
    return [...data.reconciliation.matched, ...manualMappings];
  };

  const getGrossProfit = () => {
    return getAllMatchedItems().reduce((total, item) => total + (item.profit || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const { reconciliation, extractedData } = data;
  const { summary } = reconciliation;

  return (
    <div className="reconciliation-results">
      <div className="results-header">
        <h2>📊 Reconciliation Results</h2>
        <div className="file-info">
          <p><strong>Sales Order:</strong> {extractedData.salesOrder.fileName}</p>
          <p><strong>Purchase Orders:</strong> {extractedData.purchaseOrders.map(po => po.fileName).join(', ')}</p>
        </div>
        <div className="action-buttons">
          <button onClick={onReset} className="reset-button">
            <RotateCcw className="button-icon" />
            Upload New Files
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card total">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h3>Total Sales Items</h3>
            <p className="card-number">{summary.totalSalesItems}</p>
          </div>
        </div>

        <div className="summary-card matched">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <h3>Matched Items</h3>
            <p className="card-number">{summary.matchedItems}</p>
            <p className="card-percentage">
              {summary.totalSalesItems > 0 
                ? Math.round((summary.matchedItems / summary.totalSalesItems) * 100)
                : 0}%
            </p>
          </div>
        </div>

        <div className="summary-card missing">
          <div className="card-icon">❌</div>
          <div className="card-content">
            <h3>Missing Items</h3>
            <p className="card-number">{summary.missingItems}</p>
            <p className="card-percentage">
              {summary.totalSalesItems > 0 
                ? Math.round((summary.missingItems / summary.totalSalesItems) * 100)
                : 0}%
            </p>
          </div>
        </div>

        <div className="summary-card mismatch">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <h3>Quantity Mismatches</h3>
            <p className="card-number">{summary.quantityMismatches}</p>
            <p className="card-percentage">
              {summary.totalSalesItems > 0 
                ? Math.round((summary.quantityMismatches / summary.totalSalesItems) * 100)
                : 0}%
            </p>
          </div>
        </div>

        <div className="summary-card extra">
          <div className="card-icon">➕</div>
          <div className="card-content">
            <h3>Extra Items</h3>
            <p className="card-number">{summary.extraItems}</p>
            <p className="card-subtitle">In Purchase Orders</p>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      <div className="detailed-results">
        <div className="results-tabs">
          <button
            className={`tab ${activeTab === 'matched' ? 'active' : ''}`}
            onClick={() => setActiveTab('matched')}
          >
            <CheckCircle className="tab-icon" />
            Matched ({getAllMatchedItems().length})
          </button>
          <button
            className={`tab ${activeTab === 'missing' ? 'active' : ''}`}
            onClick={() => setActiveTab('missing')}
          >
            <XCircle className="tab-icon" />
            Missing ({getFilteredMissingItems().length})
          </button>
          <button
            className={`tab ${activeTab === 'mismatches' ? 'active' : ''}`}
            onClick={() => setActiveTab('mismatches')}
          >
            <AlertTriangle className="tab-icon" />
            Mismatches ({reconciliation.quantityMismatches.length})
          </button>
          <button
            className={`tab ${activeTab === 'extra' ? 'active' : ''}`}
            onClick={() => setActiveTab('extra')}
          >
            <AlertTriangle className="tab-icon" />
            Extra ({getFilteredExtraItems().length})
          </button>
          <button
            className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            <Link className="tab-icon" />
            Manual Mapping
          </button>
          <button
            className={`tab ${activeTab === 'extracted' ? 'active' : ''}`}
            onClick={() => setActiveTab('extracted')}
          >
            <Eye className="tab-icon" />
            Extracted Data
          </button>
        </div>

        <div className="results-content">
          {activeTab === 'matched' && (
            <div className="results-section">
              <div className="section-header">
                <h3>✅ Matched Items</h3>
                <div className="header-actions">
                  <div className="gross-profit-display">
                    <span className="gross-profit-label">Gross Profit:</span>
                    <span className="gross-profit-amount">{formatCurrency(getGrossProfit())}</span>
                  </div>
                  <button
                    onClick={() => exportToCSV(getAllMatchedItems(), 'matched_items.csv')}
                    className="export-button"
                    disabled={getAllMatchedItems().length === 0}
                  >
                    <Download className="button-icon" />
                    Export CSV
                  </button>
                </div>
              </div>
              {getAllMatchedItems().length === 0 ? (
                <p className="no-data">No matched items found.</p>
              ) : (
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Sales Item Code</th>
                        <th>Purchase Item Code</th>
                        <th>Sales Quantity</th>
                        <th>Purchase Quantity</th>
                        <th>Sales Price (RMB)</th>
                        <th>Purchase Price (RMB)</th>
                        <th>Profit (RMB)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAllMatchedItems().map((item, index) => (
                        <tr key={index}>
                          <td>{item.salesItemCode}</td>
                          <td>{item.purchaseItemCode}</td>
                          <td>{item.salesQuantity}</td>
                          <td>{item.purchaseQuantity}</td>
                          <td className="price-cell">{formatCurrency(item.salesPrice || 0)}</td>
                          <td className="price-cell">{formatCurrency(item.purchasePrice || 0)}</td>
                          <td className={`profit-cell ${(item.profit || 0) >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(item.profit || 0)}
                          </td>
                          <td>
                            <span className={`status-badge ${item.status === 'manually_matched' ? 'manual' : 'matched'}`}>
                              {item.status === 'manually_matched' ? 'Manually Matched' : item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={6} className="total-label">Total Gross Profit:</td>
                        <td className={`total-profit ${getGrossProfit() >= 0 ? 'positive' : 'negative'}`}>
                          {formatCurrency(getGrossProfit())}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'missing' && (
            <div className="results-section">
              <div className="section-header">
                <h3>❌ Missing Items (Not Found in Purchase Orders)</h3>
                <button
                  onClick={() => exportToCSV(getFilteredMissingItems(), 'missing_items.csv')}
                  className="export-button"
                  disabled={getFilteredMissingItems().length === 0}
                >
                  <Download className="button-icon" />
                  Export CSV
                </button>
              </div>
              {getFilteredMissingItems().length === 0 ? (
                <p className="no-data">All sales items have corresponding purchase orders.</p>
              ) : (
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Item Code</th>
                        <th>Sales Quantity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredMissingItems().map((item, index) => (
                        <tr key={index}>
                          <td>{item.itemCode}</td>
                          <td>{item.salesQuantity}</td>
                          <td>
                            <span className="status-badge missing">{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'mismatches' && (
            <div className="results-section">
              <div className="section-header">
                <h3>⚠️ Quantity Mismatches</h3>
                <button
                  onClick={() => exportToCSV(reconciliation.quantityMismatches, 'quantity_mismatches.csv')}
                  className="export-button"
                  disabled={reconciliation.quantityMismatches.length === 0}
                >
                  <Download className="button-icon" />
                  Export CSV
                </button>
              </div>
              {reconciliation.quantityMismatches.length === 0 ? (
                <p className="no-data">No quantity mismatches found.</p>
              ) : (
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Sales Item Code</th>
                        <th>Purchase Item Code</th>
                        <th>Sales Quantity</th>
                        <th>Purchase Quantity</th>
                        <th>Difference</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation.quantityMismatches.map((item, index) => (
                        <tr key={index}>
                          <td>{item.salesItemCode}</td>
                          <td>{item.purchaseItemCode}</td>
                          <td>{item.salesQuantity}</td>
                          <td>{item.purchaseQuantity}</td>
                          <td className={item.difference > 0 ? 'positive' : 'negative'}>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </td>
                          <td>
                            <span className="status-badge mismatch">{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'extra' && (
            <div className="results-section">
              <div className="section-header">
                <h3>➕ Extra Items (Found in Purchase Orders but not in Sales Order)</h3>
                <button
                  onClick={() => exportToCSV(getFilteredExtraItems(), 'extra_items.csv')}
                  className="export-button"
                  disabled={getFilteredExtraItems().length === 0}
                >
                  <Download className="button-icon" />
                  Export CSV
                </button>
              </div>
              {getFilteredExtraItems().length === 0 ? (
                <p className="no-data">No extra items found in purchase orders.</p>
              ) : (
                <div className="data-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Item Code</th>
                        <th>Purchase Quantity</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredExtraItems().map((item, index) => (
                        <tr key={index}>
                          <td>{item.itemCode}</td>
                          <td>{item.purchaseQuantity}</td>
                          <td>
                            <span className="status-badge extra">{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="results-section">
              <div className="section-header">
                <h3>🔗 Manual Item Mapping</h3>
                <p className="section-description">
                  Map sales items (missing or quantity mismatches) to purchase items (extra or quantity mismatches) when item codes don't match exactly. 
                  Support many-to-many mapping by selecting multiple items from each side. Quantities must balance exactly.
                </p>
                <div className="mapping-mode-toggle">
                  <button
                    onClick={() => setShowCheckboxes(!showCheckboxes)}
                    className={`mode-button ${showCheckboxes ? 'active' : ''}`}
                  >
                    {showCheckboxes ? 'Switch to Single Selection' : 'Enable Many-to-Many Mapping'}
                  </button>
                </div>
              </div>
              
              <div className="manual-mapping-container">
                <div className="mapping-controls">
                  {!showCheckboxes ? (
                    // Single selection mode (original)
                    <div className="selection-row">
                      <div className="selection-group">
                        <label>Select Sales Item (Missing/Mismatch):</label>
                        <select 
                          value={selectedSalesItems[0] || ''} 
                          onChange={(e) => {
                            const newSelection = e.target.value ? [e.target.value] : [];
                            setSelectedSalesItems(newSelection);
                            validateQuantityBalance(newSelection, selectedPurchaseItems);
                          }}
                          className="selection-dropdown"
                        >
                          <option value="">Choose a sales item...</option>
                          {getAllReconcilableSalesItems().map((item, index) => (
                            <option key={index} value={item.itemCode}>
                              {item.itemCode} (Qty: {item.quantity}) - {item.type === 'missing' ? 'Missing' : 'Mismatch'}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <ArrowRight className="arrow-icon" />
                      
                      <div className="selection-group">
                        <label>Select Purchase Item (Extra/Mismatch):</label>
                        <select 
                          value={selectedPurchaseItems[0] || ''} 
                          onChange={(e) => {
                            const newSelection = e.target.value ? [e.target.value] : [];
                            setSelectedPurchaseItems(newSelection);
                            validateQuantityBalance(selectedSalesItems, newSelection);
                          }}
                          className="selection-dropdown"
                        >
                          <option value="">Choose a purchase item...</option>
                          {getAllReconcilablePurchaseItems().map((item, index) => (
                            <option key={index} value={item.itemCode}>
                              {item.itemCode} (Qty: {item.quantity}) - {item.type === 'extra' ? 'Extra' : 'Mismatch'}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <button
                        onClick={handleManualMapping}
                        disabled={selectedSalesItems.length === 0 || selectedPurchaseItems.length === 0 || isMapping || !quantityValidation.isValid}
                        className="map-button"
                      >
                        {isMapping ? 'Mapping...' : 'Map Items'}
                      </button>
                    </div>
                  ) : (
                    // Many-to-many selection mode
                    <div className="multi-selection-container">
                      <div className="selection-columns">
                        <div className="selection-column">
                          <div className="column-header">
                            <h4>Sales Items (Missing/Mismatch)</h4>
                            <button
                              onClick={handleSelectAllSales}
                              className="select-all-button"
                            >
                              {selectedSalesItems.length === getAllReconcilableSalesItems().length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="checkbox-list">
                            {getAllReconcilableSalesItems().map((item, index) => (
                              <label key={index} className="checkbox-item">
                                <input
                                  type="checkbox"
                                  checked={selectedSalesItems.includes(item.itemCode)}
                                  onChange={() => handleSalesItemToggle(item.itemCode)}
                                />
                                <span className="checkbox-label">
                                  {item.itemCode} (Qty: {item.quantity}) - {item.type === 'missing' ? 'Missing' : 'Mismatch'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        <div className="selection-column">
                          <div className="column-header">
                            <h4>Purchase Items (Extra/Mismatch)</h4>
                            <button
                              onClick={handleSelectAllPurchase}
                              className="select-all-button"
                            >
                              {selectedPurchaseItems.length === getAllReconcilablePurchaseItems().length ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          <div className="checkbox-list">
                            {getAllReconcilablePurchaseItems().map((item, index) => (
                              <label key={index} className="checkbox-item">
                                <input
                                  type="checkbox"
                                  checked={selectedPurchaseItems.includes(item.itemCode)}
                                  onChange={() => handlePurchaseItemToggle(item.itemCode)}
                                />
                                <span className="checkbox-label">
                                  {item.itemCode} (Qty: {item.quantity}) - {item.type === 'extra' ? 'Extra' : 'Mismatch'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mapping-summary">
                        <div className="summary-info">
                          <span>Selected: {selectedSalesItems.length} sales items × {selectedPurchaseItems.length} purchase items</span>
                          <span className="total-mappings">
                            = {selectedSalesItems.length * selectedPurchaseItems.length} total mappings
                          </span>
                          {selectedSalesItems.length > 0 && selectedPurchaseItems.length > 0 && (
                            <div className={`quantity-validation ${quantityValidation.isValid ? 'valid' : 'invalid'}`}>
                              <AlertCircle className="validation-icon" />
                              <span>{quantityValidation.message}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleManualMapping}
                          disabled={selectedSalesItems.length === 0 || selectedPurchaseItems.length === 0 || isMapping || !quantityValidation.isValid}
                          className={`map-button large ${!quantityValidation.isValid ? 'disabled' : ''}`}
                        >
                          {isMapping ? 'Creating Mappings...' : `Create ${selectedSalesItems.length * selectedPurchaseItems.length} Mappings`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {manualMappings.length > 0 && (
                  <div className="manual-mappings">
                    <h4>Manual Mappings Created:</h4>
                    <div className="data-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Sales Item Code</th>
                            <th>Purchase Item Code</th>
                            <th>Sales Quantity</th>
                            <th>Purchase Quantity</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manualMappings.map((mapping, index) => (
                            <tr key={index}>
                              <td>{mapping.salesItemCode}</td>
                              <td>{mapping.purchaseItemCode}</td>
                              <td>{mapping.salesQuantity}</td>
                              <td>{mapping.purchaseQuantity}</td>
                              <td>
                                <span className="status-badge manual">Manually Matched</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'extracted' && (
            <div className="results-section">
              <div className="section-header">
                <h3>📋 Extracted Data from All Files</h3>
                <button
                  onClick={() => setShowExtractedData(!showExtractedData)}
                  className="export-button"
                >
                  {showExtractedData ? <EyeOff className="button-icon" /> : <Eye className="button-icon" />}
                  {showExtractedData ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              <div className="extracted-data">
                <div className="file-section">
                  <h4>📋 Sales Order: {extractedData.salesOrder.fileName}</h4>
                  <p className="file-summary">
                    <strong>{extractedData.salesOrder.items.length}</strong> items extracted
                    {extractedData.salesOrder.items.length > 0 && (
                      <span> • Total Value: ${extractedData.salesOrder.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</span>
                    )}
                  </p>
                  
                  {showExtractedData && (
                    <div className="data-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Row</th>
                            <th>Item Code</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractedData.salesOrder.items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.rowNumber}</td>
                              <td>{item.itemCode}</td>
                              <td>{item.quantity}</td>
                              <td>${item.price.toFixed(2)}</td>
                              <td>${(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {extractedData.purchaseOrders.map((po, poIndex) => (
                  <div key={poIndex} className="file-section">
                    <h4>📦 Purchase Order {poIndex + 1}: {po.fileName}</h4>
                    <p className="file-summary">
                      <strong>{po.items.length}</strong> items extracted
                      {po.items.length > 0 && (
                        <span> • Total Value: ${po.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</span>
                      )}
                    </p>
                    
                    {showExtractedData && (
                      <div className="data-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Item Code</th>
                              <th>Quantity</th>
                              <th>Price</th>
                              <th>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {po.items.map((item, index) => (
                              <tr key={index}>
                                <td>{item.rowNumber}</td>
                                <td>{item.itemCode}</td>
                                <td>{item.quantity}</td>
                                <td>${item.price.toFixed(2)}</td>
                                <td>${(item.quantity * item.price).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReconciliationResults;