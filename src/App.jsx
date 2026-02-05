import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TabSwitcher from './components/TabSwitcher';
import FileUpload from './components/FileUpload';

import { PDFDocument, PageSizes } from 'pdf-lib';
import { Loader2, Shield, Zap, Lock } from 'lucide-react';
import JSZip from 'jszip';

/**
 * Parses a page input string like "1, 3-5, 10" into an array of page numbers.
 * Returns sorted, unique page numbers (1-based).
 */
function parsePageInput(input) {
  if (!input || !input.trim()) {
    return [];
  }

  const pages = new Set();
  const parts = input.split(',').map(p => p.trim()).filter(p => p);

  for (const part of parts) {
    if (part.includes('-')) {
      // Handle range like "3-5"
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        return null; // Invalid format
      }
      if (start > end) {
        return null; // Invalid range
      }

      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
    } else {
      // Handle single page like "1"
      const page = parseInt(part, 10);
      if (isNaN(page)) {
        return null; // Invalid format
      }
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Validates the page input string and returns an error message or null if valid.
 */
function validatePageInput(input, totalPages) {
  // Check for empty input
  if (!input || !input.trim()) {
    return 'Please enter the pages you want to extract.';
  }

  // Check for invalid characters (only allow digits, commas, hyphens, and spaces)
  if (!/^[\d,\-\s]+$/.test(input)) {
    return 'Invalid format. Use only numbers, commas, and hyphens (e.g., 1, 3-5, 10).';
  }

  // Check for malformed patterns
  if (/--/.test(input) || /,,/.test(input) || /^[,\-]/.test(input.trim()) || /[,\-]$/.test(input.trim())) {
    return 'Invalid format. Check your input for extra commas or hyphens.';
  }

  // Parse and validate the pages
  const pages = parsePageInput(input);

  if (pages === null) {
    return 'Invalid format. Use formats like: 1, 3-5, 10';
  }

  if (pages.length === 0) {
    return 'Please enter at least one page number.';
  }

  // Check if all pages are within range
  const outOfRange = pages.filter(p => p < 1 || p > totalPages);
  if (outOfRange.length > 0) {
    if (outOfRange.length === 1) {
      return `Page ${outOfRange[0]} is out of range. This PDF has ${totalPages} page${totalPages > 1 ? 's' : ''}.`;
    }
    return `Pages ${outOfRange.join(', ')} are out of range. This PDF has ${totalPages} page${totalPages > 1 ? 's' : ''}.`;
  }

  return null; // Valid
}

function App() {
  const [activeTab, setActiveTab] = useState('merge'); // 'merge' or 'split'
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [splitRange, setSplitRange] = useState('');
  const [splitError, setSplitError] = useState('');
  const [totalPages, setTotalPages] = useState(0);

  // Load PDF and get total pages when file is added in split mode
  useEffect(() => {
    const loadPdfInfo = async () => {
      if (activeTab === 'split' && files.length > 0) {
        try {
          const file = files[0];
          const fileBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(fileBuffer);
          setTotalPages(pdf.getPageCount());
        } catch (error) {
          console.error('Error loading PDF info:', error);
          setTotalPages(0);
        }
      } else {
        setTotalPages(0);
      }
    };
    loadPdfInfo();
  }, [files, activeTab]);

  // Validate input as user types (with debounce effect)
  useEffect(() => {
    if (activeTab === 'split' && splitRange && totalPages > 0) {
      const error = validatePageInput(splitRange, totalPages);
      setSplitError(error || '');
    } else {
      setSplitError('');
    }
  }, [splitRange, totalPages, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFiles([]); // Clear files when switching modes
    setSplitRange('');
    setSplitError('');
  };

  const handleMerge = async () => {
    setIsProcessing(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const fileBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBuffer);
        const pageIndices = pdf.getPageIndices();

        for (const index of pageIndices) {
          const [embeddedPage] = await mergedPdf.embedPages([pdf.getPages()[index]]);
          const embeddedPageDims = embeddedPage.scale(1);

          const a4Width = PageSizes.A4[0];
          const a4Height = PageSizes.A4[1];

          // Calculate scale to fit within A4 while maintaining aspect ratio
          const scale = Math.min(
            a4Width / embeddedPageDims.width,
            a4Height / embeddedPageDims.height
          );

          // Calculate dimensions
          const dims = embeddedPage.scale(scale);

          // Calculate centering coordinates
          const x = (a4Width - dims.width) / 2;
          const y = (a4Height - dims.height) / 2;

          // Add new A4 page and draw the embedded page
          const page = mergedPdf.addPage(PageSizes.A4);
          page.drawPage(embeddedPage, {
            ...dims,
            x,
            y,
          });
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setFiles([]); // Auto-reset
    } catch (error) {
      console.error('Error merging PDFs:', error);
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSplit = async () => {
    if (files.length === 0) return;

    // Validate input before processing
    const validationError = validatePageInput(splitRange, totalPages);
    if (validationError) {
      setSplitError(validationError);
      return;
    }

    setIsProcessing(true);
    try {
      const file = files[0];
      const fileBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(fileBuffer);

      // Parse the user's page selection (1-based)
      const selectedPages = parsePageInput(splitRange);

      // Create a new PDF with only the selected pages
      const newPdf = await PDFDocument.create();

      for (const pageNum of selectedPages) {
        // Convert 1-based user input to 0-based index for pdf-lib
        const pageIndex = pageNum - 1;
        const [copiedPage] = await newPdf.copyPages(pdf, [pageIndex]);
        newPdf.addPage(copiedPage);
      }

      // Save and download the new PDF
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);

      // Download with "splitted" filename
      link.download = 'splitted.pdf';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Reset state
      setFiles([]);
      setSplitRange('');
      setSplitError('');
    } catch (error) {
      console.error('Error splitting PDF:', error);
      alert('Failed to split PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-blue-100 font-sans text-gray-900 flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 flex flex-col justify-center items-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        {/* Main Content Wrapper */}
        <div className="w-full max-w-2xl transform -translate-y-2">
          {/* Hero Section */}
          <div className="text-center mb-4 space-y-1">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              {activeTab === 'merge' ? 'Merge PDF files' : 'Split PDF files'}
            </h1>
            <p className="text-sm text-gray-500 max-w-xl mx-auto">
              {activeTab === 'merge'
                ? 'Combine PDFs in the order you want with the easiest PDF merger available.'
                : 'Separate one page or a whole set for conversion into independent PDF files.'}
            </p>
          </div>

          <TabSwitcher activeTab={activeTab} setActiveTab={handleTabChange} />

          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 min-h-[200px] flex flex-col justify-center relative">
            <FileUpload
              files={files}
              setFiles={setFiles}
              activeTab={activeTab}
              splitRange={splitRange}
              setSplitRange={setSplitRange}
              splitError={splitError}
              totalPages={totalPages}
            />

            {files.length > 0 && (
              <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                  onClick={activeTab === 'merge' ? handleMerge : handleSplit}
                  disabled={isProcessing}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 flex justify-center items-center gap-2"
                >
                  {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isProcessing
                    ? 'Processing...'
                    : (activeTab === 'merge' ? 'Merge PDF Files' : 'Split PDF Files')
                  }
                </button>
              </div>
            )}
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-col items-center text-center space-y-2">
                <Shield className="w-8 h-8 text-blue-600 mb-1" />
                <h3 className="font-semibold text-slate-900 text-sm">Private by design</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your files are processed locally in your browser. We don't store your PDFs on our servers.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-col items-center text-center space-y-2">
                <Zap className="w-8 h-8 text-purple-600 mb-1" />
                <h3 className="font-semibold text-slate-900 text-sm">Fast & lightweight</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Merge and split PDFs in seconds. No installs, no sign-up required.
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex flex-col items-center text-center space-y-2">
                <Lock className="w-8 h-8 text-teal-600 mb-1" />
                <h3 className="font-semibold text-slate-900 text-sm">Secure connection</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The site runs over HTTPS. Upload is optional—processing works on your device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
