
import * as React from 'react';
const { useState, useRef } = React;
import { X, FileText, Upload, CheckCircle2, AlertCircle, RefreshCw, Plus, ArrowRight, Layers, Table, Receipt, Download } from 'lucide-react';
import { geminiService, ExtractedTransaction } from '../services/geminiService';
import * as XLSX from 'xlsx';

interface Props {
  onClose: () => void;
  onConfirm: (transactions: ExtractedTransaction[]) => void;
  onDownloadJSON?: () => void;
}

interface ImportFile {
  type: 'image' | 'excel';
  data: string; // Base64 for image, raw text for excel
  name: string;
}

export const DocumentParser: React.FC<Props> = ({ onClose, onConfirm, onDownloadJSON }) => {
  const [files, setFiles] = useState<ImportFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [importMode, setImportMode] = useState<'slips' | 'statement'>('slips');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputFiles = e.target.files;
    if (inputFiles && inputFiles.length > 0) {
      const newFiles: ImportFile[] = [];
      
      // Explicitly cast to File[] to avoid unknown type errors
      for (const file of Array.from(inputFiles) as File[]) {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
        
        if (isExcel) {
          const reader = new FileReader();
          const textData = await new Promise<string>((resolve) => {
            reader.onload = (e) => {
              const data = new Uint8Array(e.target?.result as ArrayBuffer);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              // Convert to CSV string to send to Gemini as text
              const csv = XLSX.utils.sheet_to_csv(worksheet);
              resolve(csv);
            };
            reader.readAsArrayBuffer(file);
          });
          newFiles.push({ type: 'excel', data: textData, name: file.name });
        } else {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          newFiles.push({ type: 'image', data: base64, name: file.name });
        }
      }

      setFiles(prev => [...prev, ...newFiles]);
      setError(null);
    }
  };

  const startParsing = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    const allExtracted: ExtractedTransaction[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        const file = files[i];
        
        let results: ExtractedTransaction[] = [];
        if (file.type === 'excel') {
          results = await geminiService.parseTabularText(file.data);
        } else {
          results = importMode === 'slips' 
            ? await geminiService.parseTradeConfirmation(file.data)
            : await geminiService.parsePortfolioStatement(file.data);
        }
        allExtracted.push(...results);
      }
      setExtracted(allExtracted);
    } catch (err: any) {
      console.error(err);
      setError(`Failed to parse documents. ${err.message || 'Ensure files are clear and in supported formats.'}`);
    } finally {
      setProcessing(false);
      setCurrentFileIndex(0);
    }
  };

  const handleConfirm = () => {
    if (importMode === 'statement' || files.some(f => f.type === 'excel')) {
      const tickersInStatement = new Set(extracted.map(e => e.ticker.toUpperCase()));
      if (confirm(`Importing these records will update positions for: ${Array.from(tickersInStatement).join(', ')}. Continue?`)) {
        onConfirm(extracted);
      }
    } else {
      onConfirm(extracted);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 my-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-20 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
               <h3 className="text-lg font-bold text-gray-900 leading-none">Smart Importer</h3>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Logic by Gemini Flash</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-xl mx-4">
             <button 
                onClick={() => setImportMode('slips')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${importMode === 'slips' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
             >
                <Receipt className="w-3.5 h-3.5" /> Buy/Sell Slips
             </button>
             <button 
                onClick={() => setImportMode('statement')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${importMode === 'statement' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}
             >
                <Table className="w-3.5 h-3.5" /> Portfolio Statement
             </button>
             {onDownloadJSON && (
               <button 
                  onClick={onDownloadJSON}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all text-gray-400 hover:text-indigo-600 hover:bg-white"
                  title="Download App Data as JSON"
               >
                  <Download className="w-3.5 h-3.5" /> Export JSON
               </button>
             )}
          </div>

          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(100vh-120px)] overflow-y-auto">
          {files.length === 0 ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-[2.5rem] p-24 flex flex-col items-center justify-center space-y-4 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer transition-all group"
            >
              <div className="bg-indigo-100 p-6 rounded-full text-indigo-600 group-hover:scale-110 transition-transform">
                <Upload className="w-12 h-12" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-900">Upload Your Files</p>
                <p className="text-sm text-gray-500 font-medium">Drag & Drop or Click to select multiple Images, PDFs, or Excel Files</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-4 tracking-widest">Supports .xlsx, .xls, .csv and images of statements</p>
              </div>
              <input type="file" multiple hidden ref={fileInputRef} accept="image/*,application/pdf,.xlsx,.xls,.csv" onChange={handleFileChange} />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 shadow-inner">
                   <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Document Queue</p>
                      <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-1 hover:underline"><Plus className="w-3 h-3" /> Add More</button>
                   </div>
                   <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                      {files.map((file, idx) => (
                        <div key={idx} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${currentFileIndex === idx && processing ? 'border-indigo-600 scale-105 shadow-xl' : 'border-white'} bg-white flex items-center justify-center`}>
                           {file.type === 'image' ? (
                             <img src={file.data} className="w-full h-full object-cover" />
                           ) : (
                             <div className="flex flex-col items-center justify-center p-2 text-center">
                               <Table className="w-8 h-8 text-green-600 mb-1" />
                               <span className="text-[8px] font-bold text-gray-500 truncate w-full">{file.name}</span>
                             </div>
                           )}
                           {currentFileIndex === idx && processing && (
                             <div className="absolute inset-0 bg-indigo-600/40 backdrop-blur-[1px] flex items-center justify-center">
                                <RefreshCw className="w-6 h-6 text-white animate-spin" />
                             </div>
                           )}
                           <button 
                             onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, i) => i !== idx)); }}
                             className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                           >
                             <X className="w-3 h-3" />
                           </button>
                        </div>
                      ))}
                   </div>
                </div>

                {!processing && extracted.length === 0 && (
                   <div className="flex gap-4">
                      <button 
                        onClick={() => setFiles([])}
                        className="flex-1 py-4 bg-white text-gray-500 border border-gray-200 rounded-xl font-black text-xs uppercase"
                      >
                        Reset
                      </button>
                      <button 
                        onClick={startParsing}
                        className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg flex items-center justify-center space-x-2 transition-all transform active:scale-[0.98]"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Run AI Extraction</span>
                      </button>
                   </div>
                )}
              </div>

              <div className="lg:col-span-7 flex flex-col min-h-[500px]">
                {processing ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-20 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                      <Layers className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-gray-900 text-xl">Analyzing {files[currentFileIndex]?.name}</p>
                      <p className="text-xs text-gray-400 mt-2 uppercase font-black tracking-widest">Document {currentFileIndex + 1} of {files.length}</p>
                    </div>
                  </div>
                ) : extracted.length > 0 ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Extracted Results</h4>
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">{extracted.length} Positions Found</span>
                    </div>
                    <div className="flex-1 space-y-3 mb-8 overflow-y-auto max-h-[500px] pr-2 scrollbar-hide">
                      {extracted.map((tx, idx) => (
                        <div key={idx} className="bg-white border border-gray-100 p-5 rounded-2xl flex items-center justify-between hover:border-indigo-200 hover:shadow-md transition-all group">
                          <div className="space-y-1">
                            <p className="text-base font-black text-indigo-600 leading-none">{tx.ticker}</p>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] text-gray-400 font-bold uppercase">{tx.date}</span>
                               <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase">Sync Snapshot</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-gray-900 leading-none">{(tx.quantity || 0).toLocaleString()} Shares</p>
                            <span className={`text-[11px] font-black uppercase text-green-600`}>
                              Cost: LKR {(tx.buyPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-6 border-t border-gray-100 bg-white sticky bottom-0 pb-2 mt-auto">
                      <button 
                        onClick={handleConfirm}
                        className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-2xl font-black shadow-2xl flex items-center justify-center space-x-3 transition-all group active:scale-[0.98]"
                      >
                        <span className="text-lg">Synchronize {extracted.length} Records</span>
                        <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <div className="bg-white p-8 rounded-full shadow-inner mb-6">
                       <Table className="w-16 h-16 text-gray-300" />
                    </div>
                    <p className="text-2xl font-black text-gray-900">Importer Ready</p>
                    <p className="text-xs text-gray-400 mt-3 max-w-[280px] mx-auto uppercase tracking-tighter font-black leading-relaxed">
                       Upload your Portfolio Excel (.xlsx, .xls, .csv) or a screenshot of the table. The AI will logically map your columns and update your holdings.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-4 p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 text-sm font-bold animate-in shake duration-300">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
