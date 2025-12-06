import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Palette, Monitor, Mic, Video, Image as ImageIcon, 
  Layout, FolderOpen, Menu, X, User, LogOut, Code, Play, Square, MessageSquare, Keyboard,
  Trash2, Download, Eye, Maximize2
} from 'lucide-react';
import { ToolType, Project } from './types';
import { generateCreativeContent, generateVoiceChat } from './services/geminiService';
import { Button, InputArea } from './components/Shared';

// --- Sub Components ---

const SidebarItem = ({ active, icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      active ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="font-medium">{label}</span>
  </button>
);

const FeatureHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <div className="mb-6 fade-in">
    <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
    <p className="text-slate-500 mt-1">{subtitle}</p>
  </div>
);

// --- Main App ---

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [error, setError] = useState('');
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.DASHBOARD);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  // Generation State
  const [prompt, setPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{data: string, mimeType: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
    code?: string;
    html?: string;
  } | null>(null);

  // Voice Studio State
  const [voiceMode, setVoiceMode] = useState<'TEXT_INPUT' | 'AUDIO_INPUT'>('TEXT_INPUT');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Projects State with Persistence
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
        const saved = localStorage.getItem('samayan_projects');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to load projects", e);
        return [];
    }
  });
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Save projects to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('samayan_projects', JSON.stringify(projects));
  }, [projects]);

  // Onboarding Logic
  const handleOnboarding = () => {
    if (!tempName.trim()) {
      setError("Please enter your name.");
      return;
    }
    setUserName(tempName);
    setIsOnboarded(true);
    setError('');
  };

  // Save Project Logic
  const saveProject = useCallback((content: any) => {
    const newProject: Project = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Robust Unique ID
        name: `${activeTool === ToolType.ANIMATION_3D ? '3D Render' : activeTool.replace('_', ' ')} - ${new Date().toLocaleTimeString()}`,
        type: activeTool,
        content: content.text || content.code || prompt || "Audio Project",
        mediaUrl: content.imageUrl || content.audioUrl,
        html: content.html,
        createdAt: Date.now()
    };
    setProjects(prev => [newProject, ...prev]);
  }, [activeTool, prompt]);

  // Project Actions
  const handleDeleteProject = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevents opening the modal
    e.preventDefault();
    
    // Immediate delete without confirm to fix "not working" complaints on some devices
    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    
    // If the deleted project was open, close the modal
    if (selectedProject?.id === id) {
        setSelectedProject(null);
    }
  };

  const handleDownloadProject = (e: React.MouseEvent | null, project: Project) => {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    const link = document.createElement('a');
    
    if (project.mediaUrl) {
        // Image or Audio
        link.href = project.mediaUrl;
        const ext = project.mediaUrl.startsWith('data:audio') ? 'wav' : 'png';
        link.download = `samayan-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${ext}`;
    } else if (project.html) {
        // Website HTML
        const blob = new Blob([project.html], { type: 'text/html' });
        link.href = URL.createObjectURL(blob);
        link.download = `samayan-website-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    } else {
        // Text
        const blob = new Blob([project.content], { type: 'text/plain' });
        link.href = URL.createObjectURL(blob);
        link.download = `samayan-text-${project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Unified Generation Handler
  const handleGenerate = async () => {
    // Validation
    if (activeTool !== ToolType.VOICE_STUDIO && !prompt && !uploadedImage) {
        alert("Please enter a prompt or upload an image.");
        return;
    }
    if (activeTool === ToolType.VOICE_STUDIO && voiceMode === 'TEXT_INPUT' && !prompt) {
        alert("Please enter text to speak.");
        return;
    }

    setIsLoading(true);
    setResult(null);

    try {
        let res: any = {};

        if (activeTool === ToolType.VOICE_STUDIO) {
            // Text to Voice Chat
            const audioData = await generateVoiceChat(prompt, 'TEXT');
            res = { audioUrl: `data:audio/mp3;base64,${audioData}`, text: prompt }; 
        } 
        else {
            // Creative Image/Text/Code tools
            res = await generateCreativeContent(
                activeTool, 
                prompt, 
                uploadedImage?.data, 
                uploadedImage?.mimeType
            );
        }

        if (res) {
            setResult(res);
            saveProject(res);
        }

    } catch (err: any) {
        console.error(err);
        alert(err.message || "Something went wrong.");
    } finally {
        setIsLoading(false);
    }
  };

  // Voice Chat (Audio to Audio) Logic
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Use a supported mime type for the browser
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            
            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                // Safely extract base64 data regardless of mime type prefix
                const base64Data = base64String.split(',')[1];
                
                setIsLoading(true);
                try {
                    // Send with generic key or specific if needed, handle mime in service
                    const responseAudio = await generateVoiceChat({ audioData: base64Data }, 'AUDIO');
                    const res = { audioUrl: `data:audio/wav;base64,${responseAudio}` };
                    setResult(res);
                    saveProject(res);
                } catch (e) {
                    console.error("Voice Error", e);
                    alert("Voice chat failed. Please try again.");
                } finally {
                    setIsLoading(false);
                }
            };
        };

        mediaRecorder.start();
        setIsRecording(true);
    } catch (e) {
        alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
  };

  const handleImageUpload = (base64: string, type: string) => {
     if (!base64) {
         setUploadedImage(null);
     } else {
         setUploadedImage({ data: base64, mimeType: type });
     }
  };

  // Switch Tool Clear State
  useEffect(() => {
    setPrompt('');
    setResult(null);
    setUploadedImage(null);
    setIsLoading(false);
    setVoiceMode('TEXT_INPUT'); 
  }, [activeTool]);


  // --- Render: Onboarding ---
  if (!isOnboarded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl p-8 shadow-2xl text-center fade-in">
          <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-500/30">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Samayan AI Lab</h1>
          <p className="text-slate-500 mb-8">Creative Studio: Ads, Web, Voice & 3D</p>
          
          <div className="space-y-4 text-left">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apka Naam Kya Hai?</label>
                <input 
                  type="text" 
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="Enter your name to start"
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <Button className="w-full" onClick={handleOnboarding}>
              Enter Studio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Render: Main App ---
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-0'} bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 ease-in-out overflow-hidden z-20`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
                <span className="font-bold text-white">S</span>
            </div>
            <h1 className="font-bold text-xl text-white tracking-tight whitespace-nowrap">Samayan AI Lab</h1>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <SidebarItem active={activeTool === ToolType.DASHBOARD} icon={Layout} label="Dashboard" onClick={() => setActiveTool(ToolType.DASHBOARD)} />
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">Design Tools</div>
            <SidebarItem active={activeTool === ToolType.AD_CREATOR} icon={Palette} label="Ad Creator" onClick={() => setActiveTool(ToolType.AD_CREATOR)} />
            <SidebarItem active={activeTool === ToolType.LOGO_DESIGNER} icon={Palette} label="Logo Designer" onClick={() => setActiveTool(ToolType.LOGO_DESIGNER)} />
            <SidebarItem active={activeTool === ToolType.THUMBNAIL_DESIGNER} icon={ImageIcon} label="Thumbnail Designer" onClick={() => setActiveTool(ToolType.THUMBNAIL_DESIGNER)} />
            <SidebarItem active={activeTool === ToolType.POSTER_DESIGNER} icon={Layout} label="Poster Designer" onClick={() => setActiveTool(ToolType.POSTER_DESIGNER)} />
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">Advanced Studio</div>
            <SidebarItem active={activeTool === ToolType.WEBSITE_DESIGNER} icon={Monitor} label="Website Designer" onClick={() => setActiveTool(ToolType.WEBSITE_DESIGNER)} />
            <SidebarItem active={activeTool === ToolType.IMAGE_LAB} icon={ImageIcon} label="Image Lab (Editor)" onClick={() => setActiveTool(ToolType.IMAGE_LAB)} />
            <SidebarItem active={activeTool === ToolType.VOICE_STUDIO} icon={Mic} label="Voice Studio" onClick={() => setActiveTool(ToolType.VOICE_STUDIO)} />
            <SidebarItem active={activeTool === ToolType.ANIMATION_3D} icon={Video} label="3D Animation (Images)" onClick={() => setActiveTool(ToolType.ANIMATION_3D)} />
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4">Storage</div>
            <SidebarItem active={activeTool === ToolType.MY_PROJECTS} icon={FolderOpen} label="My Projects" onClick={() => setActiveTool(ToolType.MY_PROJECTS)} />
        </div>

        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white">
                    {userName.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{userName}</p>
                    <p className="text-xs text-slate-500">Pro User</p>
                </div>
                <button onClick={() => window.location.reload()} className="ml-auto text-slate-500 hover:text-white">
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
                <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-500">
                Samayan AI Lab v2.4
            </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            
            {activeTool === ToolType.DASHBOARD && (
                <div className="max-w-4xl mx-auto fade-in">
                    <FeatureHeader title={`Hello, ${userName}`} subtitle="Select a tool to start creating" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { t: ToolType.AD_CREATOR, l: "Ad Creator", d: "Marketing & Social Ads", i: Palette, c: "bg-purple-100 text-purple-600" },
                            { t: ToolType.WEBSITE_DESIGNER, l: "Website Designer", d: "Generate HTML Websites", i: Monitor, c: "bg-blue-100 text-blue-600" },
                            { t: ToolType.ANIMATION_3D, l: "3D Animation", d: "Create 3D Rendered Images", i: Video, c: "bg-pink-100 text-pink-600" },
                            { t: ToolType.VOICE_STUDIO, l: "Voice Studio", d: "Talk via Text or Voice", i: Mic, c: "bg-green-100 text-green-600" },
                            { t: ToolType.LOGO_DESIGNER, l: "Logo Designer", d: "Brand Identity", i: Palette, c: "bg-orange-100 text-orange-600" },
                            { t: ToolType.IMAGE_LAB, l: "Image Lab", d: "Upload & Edit Images", i: ImageIcon, c: "bg-indigo-100 text-indigo-600" },
                        ].map((card, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setActiveTool(card.t)}
                                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl transition-all text-left group"
                            >
                                <div className={`w-12 h-12 rounded-xl ${card.c} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <card.i className="w-6 h-6" />
                                </div>
                                <h3 className="font-bold text-slate-900">{card.l}</h3>
                                <p className="text-sm text-slate-500 mt-1">{card.d}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeTool === ToolType.MY_PROJECTS && (
                <div className="max-w-6xl mx-auto fade-in pb-20">
                    <FeatureHeader title="My Projects" subtitle="View, Download or Delete your creations" />
                    {projects.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                            <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">No projects yet. Create something new!</p>
                            <Button className="mt-4 mx-auto" onClick={() => setActiveTool(ToolType.DASHBOARD)}>
                                Go to Dashboard
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {projects.map((proj) => (
                                <div 
                                    key={proj.id} 
                                    onClick={() => setSelectedProject(proj)}
                                    className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer flex flex-col group h-80 relative"
                                >
                                    <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                        {proj.mediaUrl && (proj.mediaUrl.startsWith('data:image') || proj.mediaUrl.startsWith('http')) ? (
                                            <img src={proj.mediaUrl} className="w-full h-full object-cover" alt="project" />
                                        ) : proj.html ? (
                                            <div className="w-full h-full bg-white relative">
                                                <div className="absolute inset-0 transform scale-[0.25] origin-top-left w-[400%] h-[400%] pointer-events-none opacity-80">
                                                    <iframe srcDoc={proj.html} className="w-full h-full" title="prev" />
                                                </div>
                                                <div className="absolute inset-0 bg-transparent" />
                                            </div>
                                        ) : proj.mediaUrl && proj.mediaUrl.startsWith('data:audio') ? (
                                             <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-sky-50 to-indigo-50">
                                                <Mic className="w-12 h-12 text-sky-400 mb-2" />
                                                <span className="text-xs text-sky-600 font-medium bg-white/50 px-2 py-1 rounded">Audio Project</span>
                                             </div>
                                        ) : (
                                            <div className="p-4 w-full h-full bg-slate-50 flex items-center justify-center text-center">
                                                <span className="text-xs text-slate-400 line-clamp-4">{proj.content}</span>
                                            </div>
                                        )}
                                        
                                        {/* Overlay Hover Effect (Visual only) */}
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                            <Eye className="text-white drop-shadow-md w-8 h-8 opacity-80" />
                                        </div>
                                    </div>
                                    
                                    <div className="p-3 border-t border-slate-100 flex flex-col justify-between bg-white h-24">
                                        <div className="mb-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{proj.type.replace(/_/g, ' ')}</span>
                                                <span className="text-[10px] text-slate-400">{new Date(proj.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <h4 className="font-semibold text-slate-800 truncate text-sm" title={proj.name}>{proj.name}</h4>
                                        </div>

                                        {/* Action Buttons - Always Visible */}
                                        <div className="flex gap-2 mt-auto pt-2 border-t border-slate-50 z-10 relative">
                                            <button 
                                                onClick={(e) => handleDownloadProject(e, proj)}
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 rounded text-xs font-medium transition-colors"
                                                title="Download"
                                            >
                                                <Download className="w-3 h-3" /> Save
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteProject(e, proj.id)}
                                                className="flex items-center justify-center px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Creative Tools View */}
            {activeTool !== ToolType.DASHBOARD && activeTool !== ToolType.MY_PROJECTS && (
                <div className="max-w-6xl mx-auto flex flex-col xl:flex-row gap-8 fade-in h-[calc(100vh-140px)]">
                    {/* Input Section */}
                    <div className="w-full xl:w-1/3 shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 pb-6">
                        <FeatureHeader 
                            title={activeTool.replace(/_/g, ' ')} 
                            subtitle={
                                activeTool === ToolType.ANIMATION_3D ? "Create stunning 3D rendered images (Pixar style)." :
                                activeTool === ToolType.WEBSITE_DESIGNER ? "Describe your website to get HTML code & design." :
                                activeTool === ToolType.VOICE_STUDIO ? "Chat with AI using Text or Voice." :
                                "Create professional designs instantly."
                            } 
                        />
                        
                        {activeTool === ToolType.VOICE_STUDIO && (
                            <div className="flex gap-2 bg-slate-200 p-1 rounded-xl">
                                <button 
                                    onClick={() => setVoiceMode('TEXT_INPUT')} 
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${voiceMode === 'TEXT_INPUT' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                                >
                                    <Keyboard className="w-4 h-4" /> Text se baat
                                </button>
                                <button 
                                    onClick={() => setVoiceMode('AUDIO_INPUT')} 
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${voiceMode === 'AUDIO_INPUT' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                                >
                                    <Mic className="w-4 h-4" /> Voice se baat
                                </button>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
                             {activeTool === ToolType.VOICE_STUDIO && voiceMode === 'AUDIO_INPUT' ? (
                                <div className="text-center py-10">
                                    <div className={`w-32 h-32 rounded-full mx-auto mb-8 flex items-center justify-center transition-all ${isRecording ? 'bg-red-50 animate-pulse ring-8 ring-red-50' : 'bg-slate-50'}`}>
                                        <Mic className={`w-12 h-12 ${isRecording ? 'text-red-500' : 'text-slate-400'}`} />
                                    </div>
                                    <p className="text-slate-600 mb-8 font-medium">
                                        {isRecording ? "Listening... Speak now" : "Click Start to talk"}
                                    </p>
                                    <Button 
                                        onClick={isRecording ? stopRecording : startRecording} 
                                        variant={isRecording ? 'danger' : 'primary'}
                                        className="w-full py-4 text-lg"
                                        isLoading={isLoading}
                                    >
                                        {isRecording ? "Stop Recording" : "Start Conversation"}
                                    </Button>
                                </div>
                             ) : (
                                <>
                                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                                        {activeTool === ToolType.IMAGE_LAB ? "Upload Image & Instructions" : 
                                         activeTool === ToolType.VOICE_STUDIO ? "Type your message" :
                                         "Describe your idea"}
                                    </label>
                                    <InputArea 
                                        value={prompt} 
                                        onChange={setPrompt} 
                                        onImageUpload={handleImageUpload}
                                        onSend={handleGenerate}
                                        isLoading={isLoading}
                                        placeholder={
                                            activeTool === ToolType.LOGO_DESIGNER ? "Minimalist fox logo, orange gradient..." :
                                            activeTool === ToolType.WEBSITE_DESIGNER ? "Portfolio website for a photographer, black background..." :
                                            activeTool === ToolType.ANIMATION_3D ? "Cute robot in futuristic city, 3D render..." :
                                            activeTool === ToolType.VOICE_STUDIO ? "Hello, how are you today?" :
                                            "Type here..."
                                        }
                                        imagePreview={uploadedImage?.data}
                                    />
                                </>
                             )}
                             
                             {activeTool !== ToolType.VOICE_STUDIO && (
                                <div className="mt-4 bg-sky-50 p-4 rounded-xl text-xs text-sky-800 border border-sky-100 flex items-start gap-2">
                                    <div className="mt-0.5"><div className="w-1.5 h-1.5 rounded-full bg-sky-500" /></div>
                                    <span>
                                        {activeTool === ToolType.WEBSITE_DESIGNER ? "Describe layout and colors for best website results." :
                                         activeTool === ToolType.ANIMATION_3D ? "Generates high quality 3D images (not video)." :
                                         "Uploads are optional. Describe clearly for best results."}
                                    </span>
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Output Section */}
                    <div className="flex-1 bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                {result ? <span className="w-2 h-2 rounded-full bg-green-500" /> : <span className="w-2 h-2 rounded-full bg-slate-300" />}
                                {result ? "Result Ready" : "Preview Area"}
                            </h3>
                            {result?.html && <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded text-slate-600">HTML Preview</span>}
                        </div>

                        <div className="flex-1 overflow-hidden relative flex flex-col justify-center items-center bg-slate-50">
                            {isLoading ? (
                                <div className="text-center p-8">
                                    <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
                                    <p className="text-slate-600 font-medium animate-pulse">
                                        {activeTool === ToolType.WEBSITE_DESIGNER ? "Coding website..." : "Creating magic..."}
                                    </p>
                                </div>
                            ) : result ? (
                                <>
                                    {/* Image Result */}
                                    {result.imageUrl && (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-900 overflow-auto p-4">
                                            <img src={result.imageUrl} alt="Generated" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                                        </div>
                                    )}
                                    
                                    {/* Audio Result (Voice Chat & TTS) */}
                                    {result.audioUrl && (
                                        <div className="text-center w-full max-w-md p-10 bg-white rounded-2xl shadow-xl border border-slate-100 m-4">
                                            <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Mic className="w-10 h-10 text-sky-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 mb-2">Audio Response</h3>
                                            <p className="text-slate-500 mb-6">AI generated voice message</p>
                                            <audio controls autoPlay className="w-full" src={result.audioUrl} />
                                        </div>
                                    )}

                                    {/* HTML/Website Result */}
                                    {result.html && (
                                        <div className="w-full h-full bg-white relative">
                                            <iframe 
                                                srcDoc={result.html} 
                                                className="w-full h-full border-0" 
                                                title="Website Preview" 
                                                sandbox="allow-scripts"
                                            />
                                        </div>
                                    )}

                                    {/* Fallback Text */}
                                    {result.text && !result.html && !result.imageUrl && !result.audioUrl && (
                                        <div className="prose prose-slate max-w-none p-8 w-full h-full overflow-auto">
                                            <p className="text-lg leading-relaxed">{result.text}</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-slate-400 p-8">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                        {activeTool === ToolType.ANIMATION_3D ? <Video className="w-8 h-8 opacity-40" /> : 
                                         activeTool === ToolType.VOICE_STUDIO ? <Mic className="w-8 h-8 opacity-40" /> :
                                         activeTool === ToolType.WEBSITE_DESIGNER ? <Monitor className="w-8 h-8 opacity-40" /> :
                                         <ImageIcon className="w-8 h-8 opacity-40" />}
                                    </div>
                                    <p className="font-medium">Output will appear here</p>
                                    <p className="text-sm opacity-70 mt-1">Ready to create</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </main>

      {/* Project Detail Modal Overlay */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                
                {/* Modal Header */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${selectedProject.html ? 'bg-blue-500' : 'bg-purple-500'}`} />
                        <h2 className="font-bold text-lg text-slate-900">{selectedProject.name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={(e) => handleDownloadProject(e, selectedProject)}
                            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" /> Download
                        </button>
                        <button 
                            onClick={(e) => handleDeleteProject(e, selectedProject.id)}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <button 
                            onClick={() => setSelectedProject(null)}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors ml-2"
                        >
                            <X className="w-6 h-6 text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 bg-slate-100 overflow-hidden relative flex items-center justify-center">
                    {selectedProject.mediaUrl && (selectedProject.mediaUrl.startsWith('data:image') || selectedProject.mediaUrl.startsWith('http')) ? (
                         <img src={selectedProject.mediaUrl} className="max-w-full max-h-full object-contain" alt="Full view" />
                    ) : selectedProject.html ? (
                         <iframe srcDoc={selectedProject.html} className="w-full h-full bg-white" title="Website Full View" />
                    ) : selectedProject.mediaUrl && selectedProject.mediaUrl.startsWith('data:audio') ? (
                         <div className="text-center p-10 bg-white rounded-2xl shadow-xl">
                            <Mic className="w-16 h-16 text-sky-500 mx-auto mb-4" />
                            <h3 className="text-xl font-medium mb-4">Audio Playback</h3>
                            <audio controls src={selectedProject.mediaUrl} className="w-80" />
                         </div>
                    ) : (
                         <div className="p-10 max-w-2xl bg-white rounded-xl shadow-sm overflow-y-auto max-h-full">
                            <p className="text-lg leading-relaxed whitespace-pre-wrap">{selectedProject.content}</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}

// Helper icon component for loading state reuse
function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}