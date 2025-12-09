import React, { useRef } from 'react';
import { Loader2, Upload, Send, Download } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, className, ...props }) => {
  const baseStyle = "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";
  
  // Theme: Sky Blue Main, Navy Text for Contrast, or White Text
  // Requested: "Navy blue for text and buttons" - Let's interpret Primary as Sky Blue BG with Navy Text for freshness
  const variants = {
    primary: "bg-sky-400 hover:bg-sky-500 text-navy shadow-sky-200", // Fresh look
    secondary: "bg-lightgrey hover:bg-gray-300 text-navy",
    danger: "bg-red-500 hover:bg-red-600 text-white"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className || ''}`} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
};

interface InputAreaProps {
  value: string;
  onChange: (val: string) => void;
  onImageUpload: (base64: string, type: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
  imagePreview?: string;
}

export const InputArea: React.FC<InputAreaProps> = ({ 
  value, onChange, onImageUpload, onSend, isLoading, placeholder, imagePreview 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Split to get pure base64 for API, pass full string for preview
        const base64Data = base64String.split(',')[1]; 
        onImageUpload(base64Data, file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-lightgrey flex flex-col gap-4">
      {imagePreview && (
        <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-lightgrey shadow-sm">
          <img src={`data:image/png;base64,${imagePreview}`} alt="Preview" className="w-full h-full object-cover" />
          <button 
            onClick={() => onImageUpload('', '')}
            className="absolute top-1 right-1 bg-white text-red-500 rounded-full p-1 shadow-md hover:bg-red-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      )}
      <textarea
        className="w-full bg-lightgrey-50 border border-lightgrey rounded-xl p-4 text-softblack focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-none h-32 transition-all placeholder-gray-400"
        placeholder={placeholder || "Describe what you want to create..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      />
      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isLoading} type="button" className="text-sm py-2 px-4">
                <Upload className="w-4 h-4" /> Upload
            </Button>
        </div>
        <Button onClick={onSend} isLoading={isLoading}>
           Generate <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
