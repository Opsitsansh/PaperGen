"use client";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, FileText, ChevronLeft, RotateCcw, Send, User, Bot, Loader2, Volume2, Files } from "lucide-react";
import { SparklesCore } from "./components/ui/sparkles";
import { StatefulButton } from "./components/ui/stateful-button";
import { TextGenerateEffect } from "./components/ui/text-generate-effect";

// --- 🔗 YOUR LIVE RAILWAY BACKEND ---
const BACKEND_URL = "prolific-benevolence-production.up.railway.app";
// ------------------------------------

export default function Home() {
  const [files, setFiles] = useState<File[]>([]); 
  const [mode, setMode] = useState("Generate Notes");
  const [difficulty, setDifficulty] = useState("Easy");
  const [language, setLanguage] = useState("English");
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");

  // Chat State
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [view, setView] = useState("landing"); // 'landing' | 'upload' | 'preview'

  const documentRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isChatting]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  // --- FIXED: ADDED MISSING HELPER FUNCTION ---
  const getFileDisplay = () => {
    if (files.length === 0) return "";
    if (files.length === 1) return files[0].name.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "");
    return `${files.length} files selected`;
  };

  // Helper to clean filename for display
  const cleanFileName = (name: string | undefined) => {
    if (!name) return "";
    return name.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "");
  };

  // --- TEXT TO SPEECH ---
  const handleSpeak = () => {
    if (!generatedContent) {
      alert("There is no text to read yet!");
      return;
    }

    if ('speechSynthesis' in window) {
      const synthesis = window.speechSynthesis;
      
      if (isSpeaking) {
        synthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(generatedContent);
      
      // Smart Language Selection
      let langCode = "en-US";
      if (language === "Hindi") langCode = "hi-IN";
      else if (language === "Spanish") langCode = "es-ES";
      else if (language === "French") langCode = "fr-FR";
      
      utterance.lang = langCode;
      utterance.rate = 1;

      // Try to find a matching voice
      const voices = synthesis.getVoices();
      const matchingVoice = voices.find(v => v.lang.includes(langCode));
      if (matchingVoice) utterance.voice = matchingVoice;

      utterance.onend = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      synthesis.speak(utterance);
    } else {
      alert("Your browser does not support Text-to-Speech.");
    }
  };

  // --- MAIN UPLOAD HANDLER ---
  const handleUpload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (files.length === 0) {
      alert("Please upload at least one file!");
      return;
    }

    setStatus("loading");
    setGeneratedContent("");
    setMessages([]); 

    // If Chat Mode, add first prompt to history
    if (mode === "Chat with PDF" && customPrompt) {
        setMessages([{ role: "user", content: customPrompt }]);
    }

    const formData = new FormData();
    // Append ALL selected files
    files.forEach(file => {
        formData.append("files", file);
    });
    
    formData.append("mode", mode === "Chat with PDF" ? "Chat" : mode);
    formData.append("option", difficulty);
    formData.append("language", language);
    formData.append("custom_prompt", customPrompt);

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (mode === "Chat with PDF") {
          setMessages(prev => [...prev, { role: "ai", content: data.result }]);
      } else {
          setGeneratedContent(data.result);
      }
      
      setStatus("success");

      setTimeout(() => {
        setStatus("idle");
        setView("preview");
      }, 1500);
      
    } catch (error) {
      console.error(error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  // --- CHAT HANDLER ---
  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || files.length === 0) return;

    const userMessage = chatInput;
    setChatInput(""); 
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsChatting(true);

    const history = messages.map(m => `${m.role === "user" ? "Student" : "AI Tutor"}: ${m.content}`).join("\n");
    const fullPrompt = `History:\n${history}\n\nStudent: ${userMessage}`;

    const formData = new FormData();
    files.forEach(file => {
        formData.append("files", file);
    });
    formData.append("mode", "Chat");
    formData.append("option", difficulty);
    formData.append("language", language);
    formData.append("custom_prompt", fullPrompt);

    try {
        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: "POST",
            body: formData,
        });
        const data = await response.json();
        setMessages(prev => [...prev, { role: "ai", content: data.result }]);
    } catch (error) {
        setMessages(prev => [...prev, { role: "ai", content: "Error connecting to AI." }]);
    }
    setIsChatting(false);
  };

  const downloadPDF = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!documentRef.current) return;

    const element = documentRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const data = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const imgProperties = pdf.getImageProperties(data);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

    pdf.addImage(data, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("PaperGen_Output.pdf");
  };

  return (
    <div
      onClick={() => view === "landing" && setView("upload")}
      className="min-h-screen bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30 cursor-default relative"
    >

      {/* GLOBAL BACKGROUND */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1.2}
            particleDensity={800}
            className="w-full h-full"
            particleColor="#FFFFFF"
          />
      </div>

      {/* PAGE 1: LANDING */}
      <div
        className={`fixed inset-0 w-full h-full flex flex-col items-center justify-center transition-all duration-1000 ease-in-out z-50 bg-black/80 backdrop-blur-sm ${view === "landing" ? "opacity-100 pointer-events-auto cursor-pointer" : "opacity-0 pointer-events-none translate-y-[-100%]"}`}
      >
        <h1 className="md:text-9xl text-6xl font-bold text-center text-white relative z-20">
          I-View Academy
        </h1>
        <div className="w-[40rem] h-40 relative">
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-[2px] w-3/4 blur-sm" />
          <div className="absolute inset-x-20 top-0 bg-gradient-to-r from-transparent via-indigo-500 to-transparent h-px w-3/4" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-[5px] w-1/4 blur-sm" />
          <div className="absolute inset-x-60 top-0 bg-gradient-to-r from-transparent via-sky-500 to-transparent h-px w-1/4" />
        </div>
      </div>

      {/* PAGE 2: UPLOAD FORM */}
      <div className={`absolute inset-0 flex items-center justify-center p-6 transition-all duration-700 ${view === "upload" ? "opacity-100 translate-x-0 z-40" : "opacity-0 -translate-x-20 pointer-events-none z-0"}`}>
        
        <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl relative h-[90vh] overflow-y-auto custom-scrollbar">
           
          <div className="mb-5 space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">1. Source Files (PDF or Image)</label>
            <div className="relative">
                <input
                type="file"
                multiple 
                accept=".pdf, image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileChange}
                className="w-full text-sm text-zinc-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-black file:text-white hover:file:bg-zinc-800 cursor-pointer bg-black rounded-xl border border-zinc-700 p-2 transition-all"
                />
                {files.length > 1 && (
                    <div className="absolute right-3 top-3 text-xs text-indigo-400 font-bold bg-indigo-900/30 px-2 py-1 rounded-md">
                        {files.length} Files Selected
                    </div>
                )}
            </div>
          </div>

          <div className="mb-5 space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">2. Generation Mode</label>
            <div className="relative">
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full p-4 bg-black rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500 text-white appearance-none cursor-pointer"
                >
                  <option>Generate Notes</option>
                  <option>Generate MCQs</option>
                  <option>Generate Exam Paper</option>
                  <option>Chat with PDF</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>

          <div className="mb-5 space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">3. Difficulty</label>
            <div className="relative">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full p-4 bg-black rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500 text-white appearance-none cursor-pointer"
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>

          <div className="mb-5 space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">4. Output Language</label>
            <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-4 bg-black rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500 text-white appearance-none cursor-pointer"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Hinglish</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
          </div>

          <div className="mb-8 space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest">5. Custom Instructions</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={mode === "Chat with PDF" ? "Ask your first question here..." : "E.g., Focus only on Chapter 3..."}
              className="w-full p-4 bg-black rounded-xl border border-zinc-700 focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-600 resize-none h-20 text-sm"
            />
          </div>

          <div className="mt-4 flex justify-center w-full">
            <StatefulButton 
              onClick={handleUpload} 
              status={status}
              className="w-full h-12 text-base"
            >
              {mode === "Chat with PDF" ? "Start Chat" : "Generate Content"}
            </StatefulButton>
          </div>

        </div>
      </div>

      {/* PAGE 3: PREVIEW OR CHAT */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center p-6 transition-all duration-700 ${view === "preview" ? "opacity-100 translate-x-0 z-40" : "opacity-0 translate-x-20 pointer-events-none z-0"}`}>
        
        <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col h-[85vh] shadow-2xl overflow-hidden relative">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-black">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView("upload")}
                  className="text-zinc-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="h-6 w-px bg-zinc-800 mx-2"></div>
                <p className="text-zinc-400 text-sm truncate max-w-[300px]">
                  <span className="text-indigo-400 font-semibold">{mode.replace("Generate ", "")}</span> 
                  <span className="text-zinc-600 px-2">/</span>
                  <span className="text-white font-medium">{getFileDisplay()}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                 <button
                  onClick={() => setView("upload")}
                  title="Create New"
                  className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg transition-all border border-zinc-700"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* VOICE BUTTON */}
                {mode !== "Chat with PDF" && generatedContent && (
                    <button
                      onClick={handleSpeak}
                      title="Read Aloud"
                      className={`p-2 rounded-lg transition-all border border-zinc-700 ${isSpeaking ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-zinc-800 hover:bg-zinc-700 text-white"}`}
                    >
                      <Volume2 className={`w-4 h-4 ${isSpeaking ? "animate-pulse" : ""}`} />
                    </button>
                )}

                {mode !== "Chat with PDF" && (
                  <button
                    onClick={downloadPDF}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
                  >
                    <Download className="w-4 h-4" /> Save PDF
                  </button>
                )}
              </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-auto p-8 bg-black relative custom-scrollbar" ref={chatScrollRef}>
                
                {/* --- CHAT VIEW --- */}
                {mode === "Chat with PDF" ? (
                    <div className="flex flex-col gap-6">
                        {messages.length === 0 && (
                             <TextGenerateEffect words="Ask me anything about your documents..." className="text-zinc-500 text-center mt-20" />
                        )}
                        
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-zinc-800 text-zinc-200 rounded-bl-none"}`}>
                                    <div className="flex items-center gap-2 mb-2 text-xs opacity-50 uppercase tracking-widest font-bold">
                                        {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                        {msg.role === "user" ? "You" : "PaperGen AI"}
                                    </div>
                                    <div className="prose prose-invert max-w-none text-sm">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isChatting && (
                            <div className="flex justify-start">
                                <div className="bg-zinc-800 p-4 rounded-2xl rounded-bl-none flex items-center gap-2 text-zinc-400 text-sm">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                /* --- DOCUMENT VIEW --- */
                  generatedContent ? (
                    <div ref={documentRef} className="bg-white text-black p-12 shadow-2xl min-h-full w-full max-w-[210mm] mx-auto rounded-sm">
                      <div className="prose max-w-none prose-headings:text-black prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-black">
                          <ReactMarkdown>{generatedContent}</ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                      <div className="w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4 ring-1 ring-white/10">
                        <Files className="w-10 h-10 opacity-50" />
                      </div>
                      <TextGenerateEffect words="Oxygen gets you high. In a catastrophic emergency, we're taking giant, panicked breaths." className="text-zinc-400 text-xl font-medium text-center max-w-lg" />
                    </div>
                  )
                )}
            </div>

            {/* CHAT INPUT BAR */}
            {mode === "Chat with PDF" && (
                <div className="p-4 bg-black border-t border-zinc-800">
                    <form onSubmit={handleChat} className="flex gap-2">
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type your question..."
                            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={isChatting}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}

        </div>
      </div>

    </div>
  );
}