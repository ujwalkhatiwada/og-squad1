/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Search, 
  Upload, 
  FileText, 
  TrendingDown, 
  ShieldCheck, 
  CreditCard, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  ArrowRight,
  Scan,
  PieChart,
  Zap,
  Loader2,
  Camera,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './lib/supabase';
import Tesseract from 'tesseract.js';
import { GoogleGenAI, Type } from '@google/genai';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- AI Service ---
const parseWithAI = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional medical billing auditor. Analyze the following OCR text from a medical bill: "${text}".
    
    Extract the following details with high precision:
    1. Hospital/Provider Name
    2. Total Amount (as a number)
    3. Billing Date (YYYY-MM-DD)
    4. Patient Name (if visible)
    5. Detailed line items:
       - Name of service/item
       - Amount
       - Status (Standard, Overpriced, Potential Error, Generic Available)
       - Practical suggestion for savings or correction.
    
    Return the data in a structured JSON format.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hospital_name: { type: Type.STRING },
          total: { type: Type.NUMBER },
          date: { type: Type.STRING },
          patient_name: { type: Type.STRING },
          savings: { type: Type.NUMBER, description: "Total estimated savings across all items" },
          categories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                status: { type: Type.STRING },
                suggestion: { type: Type.STRING }
              },
              required: ["name", "amount", "status"]
            }
          }
        },
        required: ["hospital_name", "total", "date", "savings", "categories"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

const uploadImage = async (file: File) => {
  try {
    const { data, error } = await supabase.storage
      .from("bills")
      .upload(`bill-${Date.now()}.jpg`, file);
    if (error) throw error;
    return data.path;
  } catch (err) {
    console.error('Error uploading image:', err);
    return null;
  }
};

const saveToSupabase = async (data: any, imagePath: string | null) => {
  try {
    const { error } = await supabase
      .from('medical_expenses')
      .insert([
        {
          hospital: data.hospital_name,
          amount: data.total,
          date: data.date,
          savings: data.savings,
          details: data.categories,
          image_path: imagePath,
          created_at: new Date().toISOString()
        }
      ]);
    if (error) throw error;
  } catch (err) {
    console.error('Error saving to Supabase:', err);
  }
};

// --- Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Features', href: '#features' },
    { name: 'Plans', href: '#pricing' },
    { name: 'Contact', href: '#footer' },
  ];

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50 liquid-glass rounded-2xl transition-all duration-300"
    >
      <div className="px-6 sm:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Zap className="text-white w-5 h-5 fill-current" />
            </div>
            <span className="text-xl font-display font-black tracking-tighter text-slate-900">HEALTHKART</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a 
                key={link.name}
                href={link.href} 
                className="relative text-sm font-bold text-slate-700 hover:text-brand-600 transition-colors group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-brand-600 transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-brand-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95">
              Get Started
            </button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-900 bg-white/20 rounded-lg">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-full left-0 right-0 mt-2 p-4 liquid-glass rounded-2xl mx-2"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-3 text-lg font-bold text-slate-800 hover:bg-brand-50 rounded-xl transition-colors"
                >
                  {link.name}
                </a>
              ))}
              <button className="w-full bg-brand-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-500/20">
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

const Hero = ({ onStartScanning }: { onStartScanning: () => void }) => {
  return (
    <section className="relative pt-48 pb-32 overflow-hidden bg-slate-50">
      {/* Dynamic Background Shapes */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-[600px] h-[600px] bg-linear-to-br from-brand-200/40 to-blue-200/40 rounded-full blur-[120px] animate-pulse-slow" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-48 -right-48 w-[800px] h-[800px] bg-linear-to-tr from-brand-100/30 to-teal-100/30 rounded-full blur-[150px] animate-pulse-slow" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-black tracking-[0.2em] text-brand-700 uppercase bg-brand-500/10 border border-brand-500/20 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
            </span>
            Next-Gen Healthcare Finance
          </div>
          
          <h1 className="text-6xl md:text-8xl font-display font-black tracking-tight text-slate-900 mb-8 leading-[0.95] md:leading-[0.9]">
            Medical bills, <br />
            <span className="gradient-text drop-shadow-sm">reimagined.</span>
          </h1>
          
          <p className="max-w-3xl mx-auto text-xl md:text-2xl text-slate-600 mb-12 leading-relaxed font-medium">
            The world's first AI-driven platform that decodes your medical expenses, 
            finds hidden savings, and offers instant flexible payment plans.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartScanning}
              className="group relative bg-brand-600 text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-brand-700 transition-all flex items-center gap-3 premium-glow"
            >
              Scan Your Bill
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <button className="px-10 py-5 rounded-2xl font-bold text-xl text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
              How it works
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-24 relative max-w-5xl mx-auto"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-linear-to-r from-brand-500 to-blue-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden shadow-3xl border border-white/50 bg-white">
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
                alt="Healthcare Dashboard"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-900/20 to-transparent" />
            </div>
          </div>
          
          {/* Floating Interactive Elements */}
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-10 -left-10 md:-left-20 liquid-glass p-6 rounded-3xl shadow-2xl hidden lg:block border-white/40"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-500 rounded-2xl shadow-lg shadow-brand-500/40">
                <TrendingDown className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Avg. Savings</p>
                <p className="text-2xl font-black text-slate-900">$1,240.00</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 md:-right-20 liquid-glass p-6 rounded-3xl shadow-2xl hidden lg:block border-white/40"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/40">
                <ShieldCheck className="text-white w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Security</p>
                <p className="text-2xl font-black text-slate-900">HIPAA Verified</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    whileHover={{ y: -12, scale: 1.02 }}
    viewport={{ once: true }}
    transition={{ 
      y: { type: "spring", stiffness: 300, damping: 20 },
      opacity: { duration: 0.5, delay }
    }}
    className="p-8 rounded-3xl bg-white border border-slate-100 hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-500/10 transition-all group cursor-default"
  >
    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-50 transition-colors">
      <Icon className="w-7 h-7 text-slate-600 group-hover:text-brand-600 transition-colors" />
    </div>
    <h3 className="text-xl font-display font-bold text-slate-900 mb-3">{title}</h3>
    <p className="text-slate-600 leading-relaxed">{description}</p>
  </motion.div>
);

const Features = () => {
  const features = [
    {
      icon: Scan,
      title: "AI Bill Scanning",
      description: "Upload a photo of your medical bill. Our AI instantly extracts line items and identifies billing errors."
    },
    {
      icon: PieChart,
      title: "Smart Categorization",
      description: "We break down complex medical jargon into simple categories like Lab Tests, Pharmacy, and Consultation."
    },
    {
      icon: TrendingDown,
      title: "Cost Optimization",
      description: "Discover cheaper alternatives for medications and procedures based on local healthcare data."
    },
    {
      icon: ShieldCheck,
      title: "Insurance Assistance",
      description: "Automatically verify if items are covered by your policy and generate claim-ready documentation."
    },
    {
      icon: CreditCard,
      title: "Flexible Payments",
      description: "Convert large bills into manageable monthly installments with 0% interest EMI options."
    },
    {
      icon: Zap,
      title: "Instant Approval",
      description: "Get BNPL (Buy Now Pay Later) approval in seconds for emergency medical expenses."
    }
  ];

  return (
    <section id="features" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-900 mb-4">Everything you need to manage health costs</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">We've built a comprehensive toolkit to ensure you never overpay for healthcare again.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} delay={i * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
};

const BillScanner = ({ onAnalyzed }: { onAnalyzed: (data: any) => void }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraMode(true);
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setError("Camera access denied. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraMode(false);
  };

  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
        await processFile(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const processFile = async (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      if (!text || text.trim().length < 10) {
        throw new Error("Could not extract enough text. Please ensure the bill is clear.");
      }
      const parsedData = await parseWithAI(text);
      const imagePath = await uploadImage(file);
      await saveToSupabase(parsedData, imagePath);
      onAnalyzed(parsedData);
      if (isCameraMode) stopCamera();
    } catch (err: any) {
      console.error('Analysis failed:', err);
      setError(err.message || "An error occurred during analysis.");
      setPreview(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    await processFile(acceptedFiles[0]);
  }, [onAnalyzed]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    multiple: false
  } as any);

  return (
    <section id="scan" className="py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200 border border-slate-100">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-display font-bold text-slate-900 mb-3">
              {isCameraMode ? "Live Scanner" : "Upload your bill"}
            </h2>
            <p className="text-slate-600">
              {isCameraMode ? "Align the bill within the frame" : "Snap a photo or upload a PDF. We'll handle the rest."}
            </p>
          </div>

          <div 
            {...getRootProps()} 
            className={cn(
              "relative aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden bg-slate-50",
              isDragActive ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:border-brand-400 hover:bg-slate-50",
              isAnalyzing && "border-brand-500 shadow-2xl shadow-brand-500/20",
              isCameraMode && "border-brand-500 border-solid"
            )}
            onClick={(e) => {
              if (isCameraMode) {
                e.stopPropagation();
                captureFrame();
              }
            }}
          >
            <input {...getInputProps()} />
            
            {isCameraMode && !isAnalyzing && (
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            <canvas ref={canvasRef} className="hidden" />
            
            <AnimatePresence mode="wait">
              {isAnalyzing ? (
                <motion.div 
                  key="analyzing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[4px]"
                >
                  {preview && (
                    <img 
                      src={preview} 
                      alt="Preview" 
                      className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                  )}
                  
                  <motion.div 
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-linear-to-r from-transparent via-brand-400 to-transparent shadow-[0_0_20px_rgba(20,184,166,1)] z-20"
                  />

                  <div className="relative z-30 text-center px-6">
                    <div className="w-16 h-16 border-4 border-white/20 border-t-brand-400 rounded-full animate-spin mx-auto mb-6 shadow-lg" />
                    <p className="text-2xl font-display font-black text-white mb-2 tracking-tight">ANALYZING DATA</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="h-2 w-2 bg-brand-400 rounded-full animate-pulse" />
                      <p className="text-sm font-bold text-brand-100 uppercase tracking-[0.3em]">Auditing line items...</p>
                    </div>
                  </div>
                </motion.div>
              ) : isCameraMode ? (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  {/* Viewfinder Corners */}
                  <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-brand-500 rounded-tl-2xl" />
                  <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-brand-500 rounded-tr-2xl" />
                  <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-brand-500 rounded-bl-2xl" />
                  <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-brand-500 rounded-br-2xl" />
                  
                  <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10">
                    <Camera className="w-5 h-5 text-brand-400" />
                    <span className="font-bold text-sm uppercase tracking-widest">Tap to Capture & Scan</span>
                  </div>
                </div>
              ) : error ? (
                <motion.div 
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center p-6"
                >
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <p className="text-xl font-bold text-red-600 mb-2">Analysis Failed</p>
                  <p className="text-slate-500 mb-6 max-w-xs mx-auto">{error}</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setError(null); }}
                    className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-all"
                  >
                    Try again
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <Upload className="w-10 h-10 text-brand-600" />
                  </div>
                  <p className="text-xl font-bold text-slate-900 mb-2">
                    {isDragActive ? "Drop it here!" : "Drag & drop or click to upload"}
                  </p>
                  <p className="text-slate-500">Supports JPG, PNG, and PDF (Max 10MB)</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                HIPAA Secure
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Encrypted
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                isCameraMode ? stopCamera() : startCamera();
              }}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all",
                isCameraMode 
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                  : "bg-brand-50 text-brand-700 hover:bg-brand-100"
              )}
            >
              {isCameraMode ? (
                <>
                  <RefreshCw className="w-5 h-5" />
                  Switch to Upload
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  Use Live Camera
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const CheckoutModal = ({ isOpen, onClose, plan, billData }: any) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('checkouts')
        .insert([
          {
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            plan_name: plan.name,
            plan_amount: plan.amount,
            bill_total: billData.total,
            bill_savings: billData.savings,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({ fullName: '', email: '', phone: '' });
      }, 3000);
    } catch (error: any) {
      console.error('Error saving checkout:', error.message);
      alert('Failed to save checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100"
          >
            {success ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-3xl font-display font-bold text-slate-900 mb-4">Order Confirmed!</h3>
                <p className="text-slate-600">Your {plan.name} plan has been activated. Check your email for details.</p>
              </div>
            ) : (
              <div className="p-8 md:p-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-display font-bold text-slate-900">Complete Checkout</h3>
                    <p className="text-slate-500">Selected: <span className="font-bold text-brand-600">{plan.name}</span></p>
                  </div>
                  <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
                    <input
                      required
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-5 bg-brand-600 text-white rounded-2xl font-black text-xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        Pay ${plan.amount}
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                  <p className="text-center text-xs text-slate-400">
                    By clicking pay, you agree to our Terms of Service and Privacy Policy.
                  </p>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const AnalysisResult = ({ data, onSelectPlan }: { data: any, onSelectPlan: (plan: any) => void }) => {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-24 bg-slate-900 text-white overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-600/10 blur-[120px] -z-0" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider mb-6">
              <CheckCircle2 className="w-4 h-4" />
              Analysis Complete
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">Your Personalized Savings Plan</h2>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed">
              We've analyzed your bill from <span className="text-white font-bold">{data.hospital_name}</span>. Good news! We found potential savings of <span className="text-brand-400 font-bold">${data.savings}</span>.
            </p>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="space-y-4"
            >
              {data.categories.map((cat: any, i: number) => (
                <motion.div 
                  key={i}
                  variants={{
                    hidden: { x: -20, opacity: 0 },
                    visible: { x: 0, opacity: 1 }
                  }}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group/item"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg group-hover/item:text-brand-400 transition-colors">{cat.name}</h4>
                    <span className="font-mono text-brand-400">${cat.amount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {cat.status === 'Standard' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    )}
                    <span className={cn(
                      cat.status === 'Standard' ? "text-green-500" : "text-orange-500",
                      "font-medium"
                    )}>
                      {cat.status}
                    </span>
                  </div>
                  {cat.suggestion && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 text-sm text-slate-400 bg-slate-800/50 p-3 rounded-xl border border-white/5 italic"
                    >
                      💡 {cat.suggestion}
                    </motion.p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="space-y-8">
            <div className="p-8 rounded-[2rem] bg-linear-to-br from-brand-600 to-brand-700 shadow-2xl">
              <h3 className="text-2xl font-display font-bold mb-6">Smart Payment Options</h3>
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-white/10 border border-white/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold">0% Interest EMI</span>
                    <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase">Popular</span>
                  </div>
                  <p className="text-3xl font-display font-bold mb-2">${(data.total / 12).toFixed(2)} <span className="text-lg font-normal text-white/60">/mo</span></p>
                  <p className="text-sm text-white/70 mb-6">Pay over 12 months with no extra cost.</p>
                  <button 
                    onClick={() => onSelectPlan({ name: '0% Interest EMI', amount: (data.total / 12).toFixed(2) })}
                    className="w-full py-4 rounded-xl bg-white text-brand-700 font-bold hover:bg-slate-100 transition-colors"
                  >
                    Choose 12 Months
                  </button>
                </div>

                <div className="p-6 rounded-2xl bg-white/10 border border-white/20">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold">BNPL (Pay in 4)</span>
                  </div>
                  <p className="text-3xl font-display font-bold mb-2">${(data.total / 4).toFixed(2)} <span className="text-lg font-normal text-white/60">/bi-weekly</span></p>
                  <p className="text-sm text-white/70 mb-6">4 interest-free payments every two weeks.</p>
                  <button 
                    onClick={() => onSelectPlan({ name: 'BNPL (Pay in 4)', amount: (data.total / 4).toFixed(2) })}
                    className="w-full py-4 rounded-xl border border-white/30 text-white font-bold hover:bg-white/10 transition-colors"
                  >
                    Choose Pay in 4
                  </button>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
              <h3 className="text-xl font-display font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="text-brand-400" />
                Insurance Claim Ready
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                We've prepared your claim documents. All line items are mapped to standard CPT codes for faster processing.
              </p>
              <button className="flex items-center gap-2 text-brand-400 font-bold hover:text-brand-300 transition-colors">
                Download Claim Package
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

const Footer = () => (
  <footer className="bg-white border-t border-slate-200 pt-20 pb-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white w-5 h-5 fill-current" />
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-slate-900">Healthkart</span>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed">
            Making healthcare affordable and transparent for everyone. Scan, save, and pay with confidence.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-6">Product</h4>
          <ul className="space-y-4 text-sm text-slate-500">
            <li><a href="#" className="hover:text-brand-600">Bill Scanner</a></li>
            <li><a href="#" className="hover:text-brand-600">Cost Estimator</a></li>
            <li><a href="#" className="hover:text-brand-600">Insurance Helper</a></li>
            <li><a href="#" className="hover:text-brand-600">Payment Plans</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-6">Company</h4>
          <ul className="space-y-4 text-sm text-slate-500">
            <li><a href="#" className="hover:text-brand-600">About Us</a></li>
            <li><a href="#" className="hover:text-brand-600">Careers</a></li>
            <li><a href="#" className="hover:text-brand-600">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-brand-600">Terms of Service</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-slate-900 mb-6">Support</h4>
          <ul className="space-y-4 text-sm text-slate-500">
            <li><a href="#" className="hover:text-brand-600">Help Center</a></li>
            <li><a href="#" className="hover:text-brand-600">Contact Us</a></li>
            <li><a href="#" className="hover:text-brand-600">HIPAA Compliance</a></li>
            <li><a href="#" className="hover:text-brand-600">Security</a></li>
          </ul>
        </div>
      </div>
      <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-slate-400 text-xs">© 2026 Healthkart Inc. All rights reserved.</p>
        <div className="flex gap-6">
          {/* Social Icons Placeholder */}
          <div className="w-5 h-5 bg-slate-100 rounded-full" />
          <div className="w-5 h-5 bg-slate-100 rounded-full" />
          <div className="w-5 h-5 bg-slate-100 rounded-full" />
        </div>
      </div>
    </div>
  </footer>
);

export default function App() {
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const scrollToScan = () => {
    document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen font-sans">
      <Navbar />
      
      <main>
        <Hero onStartScanning={scrollToScan} />
        
        <Features />
        
        <BillScanner onAnalyzed={(data) => {
          setAnalysisData(data);
          setTimeout(() => {
            document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }} />

        <div id="results">
          {analysisData && <AnalysisResult data={analysisData} onSelectPlan={handleSelectPlan} />}
        </div>

        {/* CTA Section */}
        {!analysisData && (
          <section className="py-24 bg-brand-600 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-8">Ready to take control of your medical costs?</h2>
              <button 
                onClick={scrollToScan}
                className="bg-white text-brand-600 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-slate-100 transition-all shadow-2xl shadow-brand-900/20"
              >
                Start Your Free Analysis
              </button>
            </div>
          </section>
        )}
      </main>

      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        plan={selectedPlan} 
        billData={analysisData}
      />

      <Footer />
    </div>
  );
}
