
import React, { useState, useEffect, useRef } from 'react';
import { 
  Palette, Monitor, Mic, Video, Image as ImageIcon, 
  Layout, FolderOpen, Menu, X, User, Code, Square, 
  Trash2, Download, Maximize2, Sparkles, Box, Music, 
  ArrowRight, Phone, Star, Shield, Mail, CheckCircle, Lock, Send
} from 'lucide-react';
import { ToolType, Project } from './types';
import { generateCreativeContent, generateVoiceChat } from './services/geminiService';
import { Button, InputArea } from './components/Shared';

// --- Sub Components ---

const SidebarItem = ({ active, icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 mx-auto rounded-xl transition-all duration-200 group ${
      active 
        ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-900/20 translate-x-1' 
        : 'text-gray-300 hover:bg-white/10 hover:text-white hover:translate-x-1'
    }`}
  >
    <Icon className={`w-5 h-5 transition-colors ${active ? 'text-white' : 'text-sky-400 group-hover:text-sky-300'}`} />
    <span className="truncate text-sm tracking-wide">{label}</span>
  </button>
);

// New Centered Header for Tools
const ToolCenteredHeader = ({ icon: Icon, title, subtitle }: { icon: any, title: string, subtitle: string }) => (
  <div className="flex flex-col items-center justify-center text-center mb-10 fade-in pt-6">
    <div className="w-24 h-24 bg-white rounded-full shadow-lg border-4 border-sky-100 flex items-center justify-center mb-6 transform hover:scale-105 transition-transform duration-300">
        <Icon className="w-12 h-12 text-sky-600" />
    </div>
    <h1 className="text-3xl md:text-5xl font-extrabold text-navy tracking-tight mb-2">Samayan {title}</h1>
    <p className="text-gray-500 text-lg max-w-lg mx-auto">{subtitle}</p>
    <div className="w-20 h-1.5 bg-sky-500 rounded-full mt-6"></div>
  </div>
);

// --- Decoration Components ---
const Balloons = () => {
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {[...Array(15)].map((_, i) => (
        <div 
          key={i}
          className={`absolute w-12 h-16 rounded-full opacity-80 animate-float-up ${colors[i % colors.length]}`}
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            bottom: '-100px'
          }}
        >
          <div className="absolute bottom-[-10px] left-1/2 w-0.5 h-10 bg-slate-300 -translate-x-1/2" />
        </div>
      ))}
    </div>
  );
};

const Confetti = () => {
    const colors = ['bg-red-400', 'bg-blue-400', 'bg-yellow-400', 'bg-green-400', 'bg-purple-400'];
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(30)].map((_, i) => (
          <div 
            key={i}
            className={`absolute w-3 h-3 rounded-sm opacity-90 animate-fall-down ${colors[i % colors.length]}`}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              top: '-20px'
            }}
          />
        ))}
      </div>
    );
  };

const LandingSection = ({ children, className = "", id }: { children?: React.ReactNode, className?: string, id?: string }) => (
  <section id={id} className={`py-20 px-6 md:px-12 max-w-7xl mx-auto ${className}`}>
    {children}
  </section>
);

// --- Main App ---

export default function App() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [showSurprise, setShowSurprise] = useState(false);
  const [userName, setUserName] = useState('');
  const [tempName, setTempName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.DASHBOARD);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isToolLoading, setIsToolLoading] = useState(false);
  
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [imageBase64, setImageBase64] = useState('');
  const [imageMimeType, setImageMimeType] = useState('');
  
  const [voiceMode, setVoiceMode] = useState<'text' | 'audio'>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Projects
  const [projects, setProjects] = useState<Project[]>(() => {
      try {
        const saved = localStorage.getItem('samayan_projects');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
      localStorage.setItem('samayan_projects', JSON.stringify(projects));
  }, [projects]);

  const handleToolSwitch = (tool: ToolType) => {
    setSidebarOpen(false);
    if (tool === activeTool) return;
    
    setIsToolLoading(true);
    setTimeout(() => {
      setActiveTool(tool);
      setIsToolLoading(false);
      setPrompt('');
      setResult(null);
      setImageBase64('');
    }, 1500);
  };

  const handleNameSubmit = () => {
    if (!tempName.trim()) {
      setErrorMsg("Please enter your name to continue ⚠️");
      return;
    }
    if (/\d/.test(tempName)) {
      setErrorMsg("Name cannot contain numbers.");
      return;
    }
    if (tempName.length < 3) {
      setErrorMsg("Name is too short.");
      return;
    }

    setUserName(tempName);
    
    setShowSurprise(true);
    setTimeout(() => {
      setShowSurprise(false);
      setIsOnboarded(true);
    }, 4000);
  };

  const handleGenerate = async () => {
    if (!prompt && !imageBase64 && activeTool !== ToolType.IMAGE_LAB) return;
    
    let finalPrompt = prompt;
    if (activeTool === ToolType.IMAGE_LAB && !finalPrompt) {
        finalPrompt = "Enhance this image and make it look professional.";
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const res = await generateCreativeContent(activeTool, finalPrompt, imageBase64, imageMimeType);
      setResult(res);
      
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: `${activeTool.replace('SAMAYAN_', '').replace('_', ' ')}`,
        type: activeTool,
        content: finalPrompt || "Generated Content",
        createdAt: Date.now(),
        mediaUrl: res.imageUrl,
        html: res.html || res.code 
      };
      
      setProjects(prev => {
          const updated = [newProject, ...prev];
          localStorage.setItem('samayan_projects', JSON.stringify(updated));
          return updated;
      });

    } catch (e) {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceChat = async (input: string | { audioData: string }) => {
     setIsGenerating(true);
     try {
         const res = await generateVoiceChat(input);
         const audioUrl = `data:audio/wav;base64,${res.audioData}`;
         setResult({ audioUrl: audioUrl, text: res.text });
         
         const newProject: Project = {
             id: crypto.randomUUID(),
             name: `Voice Chat`,
             type: ToolType.VOICE_STUDIO,
             content: res.text,
             mediaUrl: audioUrl,
             createdAt: Date.now()
         };
         setProjects(prev => [newProject, ...prev]);

     } catch (e) {
         console.error(e);
     } finally {
         setIsGenerating(false);
     }
  };

  const toggleRecording = async () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const mimeType = 'audio/webm'; 
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
                  const reader = new FileReader();
                  reader.readAsDataURL(audioBlob);
                  reader.onloadend = () => {
                      const base64String = reader.result as string;
                      const base64Data = base64String.split(',')[1];
                      handleVoiceChat({ audioData: base64Data });
                  };
                  stream.getTracks().forEach(track => track.stop());
              };

              mediaRecorder.start();
              setIsRecording(true);
          } catch (e) {
              alert("Microphone access denied or not available.");
          }
      }
  };

  const handleDownload = (project: Project) => {
      const link = document.createElement('a');
      if (project.mediaUrl && project.type !== ToolType.WEBSITE_DESIGNER && project.type !== ToolType.POSTER_DESIGNER) {
          link.href = project.mediaUrl;
          link.download = `samayan-${project.type.toLowerCase()}-${Date.now()}.${project.type === ToolType.VOICE_STUDIO ? 'wav' : 'png'}`;
      } else if (project.html) {
          const blob = new Blob([project.html], { type: 'text/html' });
          link.href = URL.createObjectURL(blob);
          link.download = `samayan-design-${Date.now()}.html`;
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDelete = (id: string) => {
      const updated = projects.filter(p => p.id !== id);
      setProjects(updated);
      localStorage.setItem('samayan_projects', JSON.stringify(updated));
      if (selectedProject?.id === id) setSelectedProject(null);
  };

  const renderCustomLoader = () => {
     if (activeTool === ToolType.VOICE_STUDIO) {
         return (
             <div className="flex flex-col items-center justify-center h-full gap-8 bg-black/90 text-white">
                 <div className="flex items-center gap-1 h-12">
                     {[...Array(5)].map((_, i) => (
                         <div key={i} className="w-3 bg-green-500 rounded-full animate-bounce" style={{ height: '100%', animationDelay: `${i * 0.1}s` }}></div>
                     ))}
                 </div>
                 <h2 className="text-2xl font-bold tracking-widest uppercase">Samayan Voice Studio</h2>
             </div>
         );
     } 
     if (activeTool === ToolType.WEBSITE_DESIGNER) {
         return (
             <div className="flex flex-col items-center justify-center h-full gap-8 bg-slate-900 text-white font-mono">
                 <div className="relative w-20 h-20">
                     <div className="absolute inset-0 border-4 border-blue-500 rounded-lg animate-ping"></div>
                     <Code className="absolute inset-0 m-auto text-blue-400 w-8 h-8 animate-pulse" />
                 </div>
                 <h2 className="text-2xl font-bold">Samayan Web Designer</h2>
             </div>
         );
     }
     if (activeTool === ToolType.ANIMATION_3D) {
         return (
             <div className="flex flex-col items-center justify-center h-full gap-8 bg-gray-900 text-white">
                 <div className="w-16 h-16 border-4 border-pink-500 animate-[spin_3s_linear_infinite]"></div>
                 <h2 className="text-2xl font-bold">Samayan 3D Lab</h2>
             </div>
         );
     }
     return (
         <div className="flex flex-col items-center justify-center h-full gap-6 bg-white/95">
             <div className="relative">
                <div className={`absolute inset-0 bg-sky-200 rounded-full blur-xl opacity-60 animate-pulse`}></div>
                <div className="relative z-10 bg-white p-4 rounded-full shadow-xl">
                   <Sparkles className={`w-12 h-12 text-sky-500 animate-[spin_4s_linear_infinite]`} />
                </div>
             </div>
             <div className="text-center">
                 <h2 className="text-2xl font-bold text-navy">Samayan Ad AI Lab</h2>
                 <p className="text-gray-500 mt-2 font-medium">Loading Tool...</p>
             </div>
         </div>
     );
  };

  if (showSurprise) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-sky-100 to-white flex items-center justify-center overflow-hidden z-50">
        <Balloons />
        <Confetti />
        <div className="text-center z-10 animate-bounce-slow">
          <h1 className="text-6xl font-extrabold text-navy drop-shadow-lg">Surprise!</h1>
          <p className="text-2xl text-sky-600 mt-4 font-semibold">Welcome, {userName}!</p>
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <div className="min-h-screen bg-lightgrey-50 text-softblack font-sans relative">
        <nav className="flex justify-between items-center px-6 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-navy rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
            <span className="text-2xl font-bold text-navy tracking-tight">Samayan Ad AI Lab</span>
          </div>
        </nav>

        {/* HERO SECTION WITH DIRECT NAME INPUT */}
        <LandingSection className="text-center pt-20 pb-20 relative overflow-hidden min-h-[70vh] flex flex-col items-center justify-center">
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

            <div className="relative z-10 max-w-2xl mx-auto w-full">
                <h1 className="text-5xl md:text-7xl font-extrabold text-navy leading-tight mb-8">
                    What is your <span className="text-sky-500">name?</span>
                </h1>
                
                <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 mx-4 relative overflow-hidden transform transition-all hover:scale-[1.01]">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-navy"></div>
                   
                   <div className="space-y-6">
                      <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter your name to start..."
                            className={`w-full text-center text-2xl font-bold p-5 rounded-2xl border-2 bg-gray-50 focus:bg-white focus:ring-4 outline-none transition-all ${errorMsg ? 'border-red-500 focus:ring-red-200' : 'border-gray-100 focus:ring-sky-100 focus:border-sky-400'}`}
                            value={tempName}
                            onChange={(e) => {
                                setTempName(e.target.value);
                                setErrorMsg('');
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                            autoFocus
                          />
                      </div>
                      
                      {errorMsg && (
                          <div className="text-center text-red-500 font-semibold animate-pulse flex items-center justify-center gap-2">
                              <X className="w-4 h-4" /> {errorMsg}
                          </div>
                      )}

                      <Button onClick={handleNameSubmit} className="w-full justify-center py-5 text-xl font-bold shadow-lg shadow-sky-200 hover:shadow-sky-300 rounded-2xl">
                        Enter App <ArrowRight className="w-6 h-6 ml-2" />
                      </Button>
                   </div>
                </div>
            </div>
        </LandingSection>

        {/* Simplified Info Sections */}
        <LandingSection className="pt-0">
             <div className="grid md:grid-cols-3 gap-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
                 {[
                     { icon: Monitor, title: "Web Design" },
                     { icon: Palette, title: "Ad Creator" },
                     { icon: Mic, title: "Voice Studio" }
                 ].map((service, idx) => (
                     <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100">
                         <service.icon className="w-8 h-8 text-sky-500 mx-auto mb-3" />
                         <h3 className="font-bold text-navy">{service.title}</h3>
                     </div>
                 ))}
             </div>
        </LandingSection>
      </div>
    );
  }

  const tools = [
    { id: ToolType.AD_CREATOR, icon: Palette, label: 'Ad Creator', desc: 'Create stunning advertisements' },
    { id: ToolType.LOGO_DESIGNER, icon: Sparkles, label: 'Logo Designer', desc: 'Design professional logos' },
    { id: ToolType.WEBSITE_DESIGNER, icon: Monitor, label: 'Web Designer', desc: 'Build responsive websites' },
    { id: ToolType.IMAGE_LAB, icon: ImageIcon, label: 'Image Lab', desc: 'Edit and enhance photos' },
    { id: ToolType.VOICE_STUDIO, icon: Mic, label: 'Voice Studio', desc: 'AI Voice & Speech' },
    { id: ToolType.ANIMATION_3D, icon: Box, label: '3D Animation', desc: 'Render 3D scenes' },
    { id: ToolType.THUMBNAIL_DESIGNER, icon: Layout, label: 'Thumbnail', desc: 'YouTube Thumbnails' },
    { id: ToolType.POSTER_DESIGNER, icon: Square, label: 'Poster', desc: 'Design Posters (Urdu Supported)' },
  ];

  const currentToolData = tools.find(t => t.id === activeTool);

  return (
    <div className="flex h-screen bg-lightgrey-50 text-softblack overflow-hidden">
      {/* Sidebar - Visible on MD (Tablet/Desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-navy transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} flex flex-col border-r border-navy-light`}>
        <div className="p-6 border-b border-navy-light/50 flex justify-between items-center">
           <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/30 text-xl">S</div>
               <div>
                   <h1 className="font-bold text-xl text-white tracking-tight leading-none">Samayan AI</h1>
                   <span className="text-xs text-sky-400 font-medium tracking-widest uppercase">Laboratory</span>
               </div>
           </div>
           <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/70 hover:text-white">
              <X className="w-6 h-6" />
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2 custom-scrollbar">
          <SidebarItem 
            active={activeTool === ToolType.DASHBOARD} 
            icon={Layout} 
            label="Dashboard" 
            onClick={() => handleToolSwitch(ToolType.DASHBOARD)} 
          />
          
          <div className="pt-6 pb-2 px-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
             <span>Creative Tools</span> <span className="flex-1 h-px bg-white/10"></span>
          </div>
          
          {tools.map((tool) => (
            <SidebarItem 
              key={tool.id}
              active={activeTool === tool.id}
              icon={tool.icon}
              label={tool.label} 
              onClick={() => handleToolSwitch(tool.id)}
            />
          ))}
        </div>

        <div className="p-4 bg-navy-light/20 border-t border-white/5">
             <SidebarItem 
                active={activeTool === ToolType.MY_PROJECTS} 
                icon={FolderOpen} 
                label="My Projects" 
                onClick={() => handleToolSwitch(ToolType.MY_PROJECTS)} 
              />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-lightgrey-50 relative w-full">
        
        {isToolLoading && (
           <div className="absolute inset-0 z-50 animate-in fade-in duration-300">
               {renderCustomLoader()}
           </div>
        )}

        {/* Mobile Header (Only visible on small screens) */}
        <header className="h-16 bg-white border-b border-lightgrey flex items-center justify-between px-4 md:hidden z-20 shadow-sm flex-shrink-0">
           <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="p-2 text-navy hover:bg-gray-100 rounded-lg">
                 <Menu className="w-6 h-6" />
              </button>
              <span className="font-bold text-navy truncate">Samayan AI</span>
           </div>
        </header>

        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
           <div className="fixed inset-0 bg-navy/80 z-30 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative custom-scrollbar">
           
           {/* DASHBOARD VIEW */}
           {activeTool === ToolType.DASHBOARD && (
             <div className="max-w-6xl mx-auto fade-in pb-10">
                <div className="mb-10 text-center pt-8">
                   <h1 className="text-4xl font-extrabold text-navy">Welcome, {userName}!</h1>
                   <p className="text-gray-500 mt-2 text-lg">Select a tool to start creating.</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   {tools.map((tool) => (
                      <button 
                        key={tool.id}
                        onClick={() => handleToolSwitch(tool.id)}
                        className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all border border-gray-100 flex flex-col items-center gap-5 group text-center h-full justify-center aspect-square"
                      >
                         <div className="w-20 h-20 rounded-full bg-sky-50 group-hover:bg-sky-500 flex items-center justify-center transition-all duration-300 shadow-inner group-hover:shadow-lg">
                            <tool.icon className="w-10 h-10 text-sky-600 group-hover:text-white transition-colors" />
                         </div>
                         <div>
                             <span className="block font-bold text-navy text-lg group-hover:text-sky-600 transition-colors">{tool.label}</span>
                         </div>
                      </button>
                   ))}
                </div>
             </div>
           )}

           {/* MY PROJECTS VIEW */}
           {activeTool === ToolType.MY_PROJECTS && (
              <div className="max-w-7xl mx-auto fade-in pb-10">
                  <ToolCenteredHeader icon={FolderOpen} title="My Projects" subtitle="Manage and download your saved creations" />
                  
                  {projects.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                          <p className="text-gray-400 text-lg font-medium">Your gallery is empty.</p>
                          <Button className="mt-4" onClick={() => handleToolSwitch(ToolType.DASHBOARD)}>Start Creating</Button>
                      </div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {projects.map((project) => (
                              <div key={project.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-gray-100 flex flex-col group">
                                  <div 
                                    className="h-56 bg-gray-100 relative cursor-pointer flex items-center justify-center overflow-hidden"
                                    onClick={() => setSelectedProject(project)}
                                  >
                                      {project.mediaUrl && !project.mediaUrl.startsWith('data:audio') ? (
                                          <img src={project.mediaUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                      ) : project.type === ToolType.WEBSITE_DESIGNER || project.type === ToolType.POSTER_DESIGNER ? (
                                          <div className="flex flex-col items-center text-gray-400">
                                              <Monitor className="w-16 h-16 mb-2 text-sky-300" />
                                              <span className="text-sm font-bold uppercase tracking-wider">Web Preview</span>
                                          </div>
                                      ) : project.type === ToolType.VOICE_STUDIO ? (
                                          <div className="flex flex-col items-center text-gray-400">
                                              <Music className="w-16 h-16 mb-2 text-sky-300" />
                                              <span className="text-sm font-bold uppercase tracking-wider">Audio Recording</span>
                                          </div>
                                      ) : (
                                          <span className="text-gray-400">No Preview</span>
                                      )}
                                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <span className="bg-white text-navy px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 text-sm">
                                              <Maximize2 className="w-4 h-4" /> Open View
                                          </span>
                                      </div>
                                  </div>

                                  <div className="p-5 flex flex-col flex-1">
                                      <div className="flex-1 mb-4">
                                          <h3 className="font-bold text-navy text-lg truncate">{project.name}</h3>
                                          <span className="text-xs text-gray-400 font-semibold uppercase">{project.type.replace(/_/g, ' ')}</span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-3">
                                          <Button variant="secondary" onClick={() => handleDownload(project)} className="w-full py-2 text-sm font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100">
                                              Save Image
                                          </Button>
                                          <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(project.id);
                                            }}
                                            className="bg-red-50 hover:bg-red-100 text-red-600 rounded-xl px-4 py-2 flex items-center justify-center gap-2 font-semibold text-sm transition-colors border border-red-100"
                                          >
                                              <Trash2 className="w-4 h-4" /> Delete
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
           )}

           {/* CREATIVE TOOLS VIEW */}
           {activeTool !== ToolType.DASHBOARD && activeTool !== ToolType.MY_PROJECTS && currentToolData && (
             <div className="max-w-4xl mx-auto pb-20">
               {/* CENTERED LOGO & TITLE REQUESTED BY USER */}
               <ToolCenteredHeader 
                  icon={currentToolData.icon} 
                  title={currentToolData.label} 
                  subtitle={currentToolData.desc} 
               />

               <div className="flex flex-col gap-8 fade-in" style={{ animationDelay: '0.2s' }}>
                 {activeTool === ToolType.VOICE_STUDIO ? (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-lightgrey text-center relative overflow-hidden">
                        <div className="flex justify-center gap-4 mb-8 bg-lightgrey-50 p-1.5 rounded-2xl inline-flex mx-auto border border-gray-200">
                             <button 
                                onClick={() => setVoiceMode('audio')}
                                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${voiceMode === 'audio' ? 'bg-white shadow-md text-navy' : 'text-gray-500 hover:text-navy'}`}
                             >
                                🎙️ Talk via Voice
                             </button>
                             <button 
                                onClick={() => setVoiceMode('text')}
                                className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${voiceMode === 'text' ? 'bg-white shadow-md text-navy' : 'text-gray-500 hover:text-navy'}`}
                             >
                                ⌨️ Talk via Text
                             </button>
                        </div>

                        {voiceMode === 'audio' ? (
                            <div className="py-8">
                                <div className="relative inline-block">
                                    {isRecording && <div className="absolute inset-0 bg-red-400 rounded-full animate-ping opacity-75"></div>}
                                    <button 
                                        onClick={toggleRecording}
                                        className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? 'bg-red-500 shadow-xl scale-105' : 'bg-navy hover:bg-navy-light shadow-xl hover:-translate-y-1'}`}
                                    >
                                        {isRecording ? <Square className="w-10 h-10 text-white" /> : <Mic className="w-10 h-10 text-white" />}
                                    </button>
                                </div>
                                <p className="mt-6 text-gray-500 font-medium">
                                    {isRecording ? "Listening... Tap to stop" : "Tap microphone to start speaking"}
                                </p>
                            </div>
                        ) : (
                            <InputArea 
                                value={prompt} 
                                onChange={setPrompt} 
                                onImageUpload={() => {}} 
                                onSend={() => handleVoiceChat(prompt)} 
                                isLoading={isGenerating} 
                                placeholder="Type your message here..."
                            />
                        )}
                    </div>
                 ) : (
                    <InputArea 
                        value={prompt}
                        onChange={setPrompt}
                        onImageUpload={(base64, type) => {
                            setImageBase64(base64);
                            setImageMimeType(type);
                        }}
                        onSend={handleGenerate}
                        isLoading={isGenerating}
                        placeholder={
                            activeTool === ToolType.WEBSITE_DESIGNER ? "Describe the website you want to build..." :
                            activeTool === ToolType.POSTER_DESIGNER ? "Describe the poster (include text details)..." :
                            "Describe what you want to create..."
                        }
                        imagePreview={imageBase64}
                    />
                 )}

                 {result && (
                    <div className="bg-white p-8 rounded-3xl shadow-xl border border-sky-100 animate-in fade-in slide-in-from-bottom-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-navy text-xl flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-sky-500" /> Generated Result
                            </h3>
                            {result.html && (
                                <Button variant="secondary" onClick={() => {
                                    const win = window.open('', '_blank');
                                    if (win) { win.document.write(result.html); win.document.close(); }
                                }} className="text-xs px-4">
                                    <Maximize2 className="w-4 h-4 mr-2" /> Full Screen
                                </Button>
                            )}
                        </div>

                        <div className="min-h-[300px] flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                            {result.imageUrl ? (
                                <img src={result.imageUrl} alt="Generated" className="max-w-full rounded-lg shadow-sm" />
                            ) : result.html ? (
                                <iframe 
                                    srcDoc={result.html} 
                                    className="w-full h-[500px] border-none bg-white" 
                                    title="Preview"
                                />
                            ) : result.audioUrl ? (
                                <div className="text-center w-full p-10">
                                    <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-200">
                                        <Music className="w-10 h-10 text-white" />
                                    </div>
                                    <audio controls src={result.audioUrl} className="w-full max-w-md mx-auto mb-6" autoPlay />
                                    {result.text && <p className="text-navy font-medium bg-white p-6 rounded-2xl border border-gray-200 shadow-sm inline-block max-w-xl text-lg">"{result.text}"</p>}
                                </div>
                            ) : (
                                <div className="p-6 text-softblack whitespace-pre-wrap font-mono text-base">
                                    {result.text}
                                </div>
                            )}
                        </div>
                    </div>
                 )}
               </div>
             </div>
           )}

        </main>
      </div>

      {selectedProject && (
          <div className="fixed inset-0 z-50 bg-navy/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
              <button 
                onClick={() => setSelectedProject(null)}
                className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-50"
              >
                  <X className="w-8 h-8" />
              </button>
              
              <div className="bg-white rounded-3xl w-full max-w-6xl max-h-full overflow-hidden shadow-2xl flex flex-col relative">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div>
                          <h3 className="font-bold text-navy text-2xl">{selectedProject.name}</h3>
                          <span className="text-xs text-gray-400 font-bold uppercase">{selectedProject.type.replace(/_/g, ' ')}</span>
                      </div>
                      <Button onClick={() => handleDownload(selectedProject)} className="shadow-sky-200">
                          Save Image <Download className="w-4 h-4" />
                      </Button>
                  </div>
                  <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center min-h-[60vh] p-4">
                       {selectedProject.mediaUrl && !selectedProject.mediaUrl.startsWith('data:audio') ? (
                           <img src={selectedProject.mediaUrl} alt="Full view" className="max-w-full max-h-[75vh] object-contain shadow-2xl rounded-lg" />
                       ) : selectedProject.html ? (
                           <iframe srcDoc={selectedProject.html} className="w-full h-[75vh] bg-white rounded-lg shadow-sm" />
                       ) : selectedProject.mediaUrl && selectedProject.mediaUrl.startsWith('data:audio') ? (
                           <div className="text-center p-12 bg-white rounded-3xl shadow-lg">
                               <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-200">
                                  <Music className="w-14 h-14 text-white" />
                               </div>
                               <audio controls src={selectedProject.mediaUrl} className="w-80" />
                           </div>
                       ) : (
                           <pre className="p-8 whitespace-pre-wrap font-mono text-sm text-gray-700 bg-white m-8 rounded-xl shadow-sm overflow-auto max-h-[60vh] w-full border border-gray-200">
                               {selectedProject.content}
                           </pre>
                       )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
