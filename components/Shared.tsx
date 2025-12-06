import React, { useRef } from 'react';
import { Loader2, Upload, Send, Download } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading, className, ...props }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30",
    secondary: "bg-slate-200 hover:bg-slate-300 text-slate-900",
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
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
      {imagePreview && (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200">
          <img src={`data:image/png;base64,${imagePreview}`} alt="Preview" className="w-full h-full object-cover" />
          <button 
            onClick={() => onImageUpload('', '')}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs"
          >
            ✕
          </button>
        </div>
      )}
      <textarea
        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none h-24"
        placeholder={placeholder || "Describe what you want to create..."}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      />
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={isLoading} type="button">
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
