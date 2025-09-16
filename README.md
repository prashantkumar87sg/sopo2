# 📊 Logistics Reconciliation Tool

A modern web application for reconciling Sales Order and Purchase Order files in Excel format. This tool helps ensure that every item in your Sales Order has an equivalent item across your Purchase Orders with matching quantities.

## ✨ Features

- **Drag & Drop Interface**: Easy file upload with modern drag-and-drop functionality
- **Excel File Support**: Handles both .xlsx and .xls formats
- **Smart Column Detection**: Automatically suggests item code and quantity columns
- **Comprehensive Reconciliation**: 
  - Matched items (perfect matches)
  - Missing items (in Sales Order but not in Purchase Orders)
  - Quantity mismatches (same item, different quantities)
  - Extra items (in Purchase Orders but not in Sales Order)
- **Visual Results**: Beautiful dashboard with summary cards and detailed tables
- **Export Functionality**: Export results to CSV for further analysis
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

## 🚀 Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
Logistics9/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types.ts        # TypeScript type definitions
│   │   └── App.tsx         # Main application component
├── server/                 # Node.js backend
│   └── index.js           # Express server with API endpoints
├── uploads/               # Temporary file storage (auto-created)
└── package.json           # Project dependencies and scripts
```

## 🔧 How to Use

### 1. Upload Files
- **Sales Order File**: Upload your main Sales Order Excel file
- **Purchase Order Files**: Upload one or more Purchase Order Excel files
- The system will automatically analyze the files and suggest column mappings

### 2. Configure Column Mapping
- Select the column containing **Item Codes** (e.g., "Product ID", "SKU", "Item Code")
- Select the column containing **Quantities** (e.g., "Quantity", "Qty", "Amount")
- The system will use these column names to find matching columns in all files

### 3. Run Reconciliation
- Click "Start Reconciliation" to process the files
- The system will compare items and quantities across all files
- Results will be displayed in a comprehensive dashboard

### 4. Review Results
- **Summary Cards**: Quick overview of reconciliation status
- **Detailed Tables**: View specific items in each category
- **Export Options**: Download results as CSV files for further analysis

## 📊 Understanding the Results

### Matched Items ✅
Items that exist in both Sales Order and Purchase Orders with identical quantities.

### Missing Items ❌
Items present in the Sales Order but not found in any Purchase Order files.

### Quantity Mismatches ⚠️
Items that exist in both files but with different quantities. The difference is shown (positive = more in Purchase Orders, negative = less in Purchase Orders).

### Extra Items ➕
Items found in Purchase Orders but not present in the Sales Order.

## 🛠️ Technical Details

### Backend (Node.js + Express)
- **File Processing**: Uses SheetJS (xlsx) for Excel file parsing
- **File Upload**: Multer for handling multipart file uploads
- **API Endpoints**:
  - `POST /api/reconcile`: Main reconciliation endpoint
  - `POST /api/analyze-file`: File analysis for column suggestions
  - `GET /api/health`: Health check endpoint

### Frontend (React + TypeScript)
- **File Upload**: React Dropzone for drag-and-drop functionality
- **UI Components**: Custom components with modern styling
- **State Management**: React hooks for state management
- **Export**: Client-side CSV generation and download

### Key Dependencies
- **Backend**: express, multer, xlsx, cors, dotenv
- **Frontend**: react, typescript, axios, react-dropzone, lucide-react

## 🔒 Security & Privacy

- Files are processed temporarily and automatically deleted after reconciliation
- No data is stored permanently on the server
- All processing happens locally on your machine
- No external API calls or data transmission

## 🐛 Troubleshooting

### Common Issues

1. **"Only Excel files are allowed"**
   - Ensure your files are in .xlsx or .xls format
   - Check that the file extension matches the actual file type

2. **"Column not found"**
   - Verify that the column names you specified exist in your files
   - Check for typos or extra spaces in column names
   - The system is case-insensitive but must match the exact text

3. **"No data found"**
   - Ensure your Excel files have data in the specified columns
   - Check that the first row contains headers
   - Verify that data rows contain valid item codes and quantities

4. **Server connection issues**
   - Ensure the backend server is running on port 5000
   - Check that no other application is using port 5000
   - Try restarting the application with `npm run dev`

## 📝 File Format Requirements

### Excel File Structure
- First row should contain column headers
- Data should start from the second row
- Item codes should be in a single column (text format)
- Quantities should be in a single column (numeric format)
- Empty rows are automatically skipped

### Supported File Types
- Microsoft Excel (.xlsx)
- Microsoft Excel 97-2003 (.xls)

## 🤝 Contributing

This is a standalone reconciliation tool. If you need modifications or additional features, you can:

1. Fork the repository
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or need help:

1. Check the troubleshooting section above
2. Verify your file formats and column mappings
3. Ensure all dependencies are properly installed
4. Check the browser console for any error messages

---

**Built with ❤️ using React, Node.js, and modern web technologies**