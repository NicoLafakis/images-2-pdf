import { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  Download, 
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  Trash2,
  Loader2,
  Maximize,
  Layout,
  Smartphone,
  Monitor
} from 'lucide-react';

/**
 * ImageToPdfConverter
 * A single-file React application to convert multiple PNGs to a single PDF.
 * Updated with Orientation and Auto-Fit logic for better LinkedIn formatting.
 */

interface ImageItem {
  id: string;
  file: File;
  preview: string;
  name: string;
}

type Orientation = 'p' | 'l' | 'auto';

export default function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isLibLoaded, setIsLibLoaded] = useState<boolean>(false);
  const [pdfName, setPdfName] = useState<string>('linkedin-presentation.pdf');
  
  // Settings
  const [orientation, setOrientation] = useState<Orientation>('auto');
  const [margin, setMargin] = useState<number>(0); // 0 is best for "removing background"
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamically load jsPDF from CDN
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => setIsLibLoaded(true);
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) document.body.removeChild(existingScript);
    };
  }, []);

  const handleFiles = (files: FileList) => {
    const newImages: ImageItem[] = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file),
        name: file.name
      }));
    
    setImages(prev => [...prev, ...newImages]);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { 
    e.preventDefault(); 
    setIsDragging(true); 
  };
  
  const onDragLeave = () => { 
    setIsDragging(false); 
  };
  
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      const removed = prev.find(img => img.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const moveImage = (index: number, direction: number) => {
    const newImages = [...images];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setImages(newImages);
  };

  const generatePdf = async () => {
    if (images.length === 0 || !isLibLoaded) return;
    setIsGenerating(true);

    try {
      const { jsPDF } = window.jspdf;
      
      // Initialize PDF with first image specs if in auto mode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pdf: any = null;

      for (let i = 0; i < images.length; i++) {
        const imgData = await getBase64(images[i].file);
        const img = new Image();
        img.src = images[i].preview;
        
        await new Promise<void>((resolve) => {
          img.onload = () => {
            const imgWidthInPx = img.width;
            const imgHeightInPx = img.height;
            
            // Convert px to mm (standard 72dpi for jsPDF is roughly 0.264583 mm per px)
            const pxToMm = 0.264583;
            const widthMm = imgWidthInPx * pxToMm;
            const heightMm = imgHeightInPx * pxToMm;

            const pageOrientation: 'l' | 'p' = orientation === 'auto' 
              ? (widthMm > heightMm ? 'l' : 'p') 
              : orientation;

            if (i === 0) {
              // Create the PDF instance based on the first image's needs
              pdf = new jsPDF({
                orientation: pageOrientation,
                unit: 'mm',
                format: orientation === 'auto' ? [widthMm, heightMm] : 'a4'
              });
            } else {
              pdf.addPage(orientation === 'auto' ? [widthMm, heightMm] : 'a4', pageOrientation);
            }

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Calculate scaling to fill page
            const ratio = Math.min(
              (pageWidth - margin * 2) / widthMm, 
              (pageHeight - margin * 2) / heightMm
            );
            
            const finalWidth = widthMm * ratio;
            const finalHeight = heightMm * ratio;
            const x = (pageWidth - finalWidth) / 2;
            const y = (pageHeight - finalHeight) / 2;

            const format = images[i].file.type === 'image/png' ? 'PNG' : 'JPEG';
            pdf.addImage(imgData, format, x, y, finalWidth, finalHeight);
            resolve();
          };
        });
      }

      if (pdf) {
        pdf.save(pdfName.endsWith('.pdf') ? pdfName : `${pdfName}.pdf`);
      }
    } catch (error) {
      console.error("PDF Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <FileText size={24} />
              </div>
              Social PDF Creator
            </h1>
            <p className="text-slate-500 mt-1">Perfect for LinkedIn carousels and slide presentations.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
              <button 
                onClick={() => setOrientation('p')}
                className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${orientation === 'p' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Force Portrait (A4)"
              >
                <Smartphone size={16} /> Portrait
              </button>
              <button 
                onClick={() => setOrientation('l')}
                className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${orientation === 'l' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Force Landscape (A4)"
              >
                <Monitor size={16} /> Landscape
              </button>
              <button 
                onClick={() => setOrientation('auto')}
                className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${orientation === 'auto' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Match Image Aspect Ratio (Best for LinkedIn)"
              >
                <Maximize size={16} /> Auto-Fit
              </button>
            </div>

            {images.length > 0 && (
              <button 
                onClick={generatePdf}
                disabled={isGenerating || !isLibLoaded}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                  (isGenerating || !isLibLoaded)
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 active:scale-95'
                }`}
              >
                {isGenerating ? (
                  <><Loader2 className="animate-spin" size={18} /> Building...</>
                ) : (
                  <><Download size={18} /> Export PDF</>
                )}
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workspace */}
          <div className="lg:col-span-2 space-y-6">
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragging 
                ? 'border-blue-500 bg-blue-50 scale-[1.01]' 
                : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
              }`}
            >
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                aria-label="Upload images"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center">
                  <Upload size={28} />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">Add slides or images</p>
                  <p className="text-sm text-slate-400 mt-0.5">Drag & drop or click to upload</p>
                </div>
              </div>
            </div>

            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                  <span>Reorder Slides</span>
                  <button onClick={() => setImages([])} className="text-red-400 hover:text-red-600 lowercase tracking-normal font-normal">
                    clear all
                  </button>
                </div>
                {images.map((img, index) => (
                  <div 
                    key={img.id}
                    className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-4 shadow-sm group hover:border-blue-200 transition-colors"
                  >
                    <div className="flex flex-col gap-1 text-slate-300">
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveImage(index, -1); }}
                        disabled={index === 0}
                        className="hover:text-blue-500 disabled:opacity-0 p-1"
                        aria-label="Move slide up"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); moveImage(index, 1); }}
                        disabled={index === images.length - 1}
                        className="hover:text-blue-500 disabled:opacity-0 p-1"
                        aria-label="Move slide down"
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>

                    <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 relative group-hover:border-blue-100 transition-colors">
                      <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="flex-grow min-w-0">
                      <p className="text-sm font-bold text-slate-700 truncate">{img.name}</p>
                      <p className="text-[10px] text-blue-500 font-black uppercase mt-0.5">Slide {index + 1}</p>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      aria-label="Remove slide"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-100/50 rounded-2xl border border-slate-200/50 p-20 text-center">
                <ImageIcon className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-slate-400 text-sm">No slides added yet</p>
              </div>
            )}
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layout size={18} className="text-blue-600" />
                Document Settings
              </h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="pdf-filename" className="text-xs font-black text-slate-400 uppercase tracking-wider">File Name</label>
                  <input 
                    id="pdf-filename"
                    type="text" 
                    value={pdfName}
                    onChange={(e) => setPdfName(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter file name"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="padding-slider" className="text-xs font-black text-slate-400 uppercase tracking-wider">Padding (Background)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      id="padding-slider"
                      type="range" min="0" max="20" step="5" 
                      value={margin} 
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="flex-grow"
                      aria-label="Padding in millimeters"
                    />
                    <span className="text-sm font-bold text-slate-700 w-8">{margin}mm</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    {margin === 0 ? "Perfect! Content will fill the entire slide." : "Adds a white border around images."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-100">
              <h3 className="font-bold text-sm mb-2">Pro Tip for LinkedIn</h3>
              <p className="text-xs leading-relaxed opacity-90">
                Use <span className="font-bold underline">Auto-Fit</span> and set <span className="font-bold underline">Padding to 0</span>. This ensures your images fill the entire slide viewer without any background color showing!
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 py-8 border-t border-slate-200 max-w-4xl mx-auto text-center text-slate-400 text-xs">
        <p>100% Client-side processing.</p>
        {!isLibLoaded && <p className="text-orange-400 mt-2 font-bold animate-pulse">Initializing engine...</p>}
      </footer>
    </div>
  );
}
