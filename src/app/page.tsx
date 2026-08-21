"use client";

import { useEffect, useRef, useState } from "react";

const FRAME_COUNT = 240;
const SCENE_COUNT = 6;

const getFramePath = (index: number) => {
  const pad = index.toString().padStart(3, "0");
  return "/frames/frame_" + pad + ".jpg";
};

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeScene, setActiveScene] = useState(1);
  const [imagesLoaded, setImagesLoaded] = useState(0);

  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameRef = useRef(-1);

  // Refs for text sections and stats
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const liveDataRef = useRef<HTMLSpanElement>(null);
  const efficiencyRef = useRef<HTMLSpanElement>(null);
  
  // New Interactive Refs
  const magneticRef = useRef<HTMLButtonElement>(null);

  // Magnetic Button Logic
  useEffect(() => {
    const btn = magneticRef.current;
    if (!btn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    };

    const handleMouseLeave = () => {
      btn.style.transform = `translate(0px, 0px)`;
    };

    btn.addEventListener('mousemove', handleMouseMove);
    btn.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      btn.removeEventListener('mousemove', handleMouseMove);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Animated Numbers Logic
  const animateNumbers = (target: number, ref: React.RefObject<HTMLSpanElement | null>) => {
    if (!ref.current) return;
    const duration = 2500;
    const start = parseInt(ref.current.innerText) || 0;
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(start + (target - start) * ease);
      
      if (ref.current) {
        ref.current.innerText = current.toString();
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    requestAnimationFrame(update);
  };

  useEffect(() => {
    if (activeScene === 4) {
      animateNumbers(50, liveDataRef);
      animateNumbers(1, efficiencyRef);
    } else {
      if (liveDataRef.current) liveDataRef.current.innerText = "0";
      if (efficiencyRef.current) efficiencyRef.current.innerText = "0";
    }
  }, [activeScene]);

  // Preload images
  useEffect(() => {
    let loaded = 0;
    const images: HTMLImageElement[] = [];
    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new window.Image();
      img.src = getFramePath(i);
      img.onload = () => {
        loaded++;
        setImagesLoaded(loaded);
      };
      images.push(img);
    }
    imagesRef.current = images;
  }, []);

  // Handle Scroll and Text Animation
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawFrame = (frameIndex: number) => {
      const img = imagesRef.current[frameIndex];
      if (!img || !img.complete) return;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const canvasAspect = window.innerWidth / window.innerHeight;
      const imgAspect = img.width / img.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (canvasAspect > imgAspect) {
        drawWidth = window.innerWidth;
        drawHeight = window.innerWidth / imgAspect;
        offsetX = 0;
        offsetY = (window.innerHeight - drawHeight) / 2;
      } else {
        drawHeight = window.innerHeight;
        drawWidth = window.innerHeight * imgAspect;
        offsetX = (window.innerWidth - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    };

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
      
      currentFrameRef.current = -1;
      const frameIndex = Math.max(0, currentFrameRef.current);
      if (imagesRef.current[frameIndex]?.complete) {
        drawFrame(frameIndex);
      }
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const update = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const maxScroll = container.scrollHeight - windowHeight;
      const scrollFraction = Math.max(0, Math.min(1, scrollY / maxScroll));

      // 4. Sahneye (0.8 scrollFraction) gelindiğinde video bitmiş (frame 239) olacak!
      const videoProgress = Math.min(1, scrollFraction / 0.8);
      const frameIndex = Math.floor(videoProgress * (FRAME_COUNT - 1));
      
      if (frameIndex !== currentFrameRef.current) {
        const img = imagesRef.current[frameIndex];
        if (img && img.complete) {
          drawFrame(frameIndex);
          currentFrameRef.current = frameIndex;
        }
      }

      // Calculate active scene for UI
      const currentSceneIndex = Math.min(
        SCENE_COUNT,
        Math.max(1, Math.ceil(scrollFraction * SCENE_COUNT))
      );
      setActiveScene(currentSceneIndex);

      // Animate text sections natively
      sectionRefs.current.forEach((section, index) => {
        if (!section) return;

        // Calculate how far the section is from the center of the viewport
        const sectionTop = section.parentElement?.offsetTop || 0;
        const distance = (scrollY + windowHeight / 2) - (sectionTop + windowHeight / 2);
        
        // Normalize distance based on viewport height (0 = center, 1 = 1 viewport away)
        const normalizedDistance = distance / windowHeight;

        // Fly-Through Effect for Scene 1 (Index 0)
        if (index === 0) {
          const scrollProgress = Math.max(0, -distance) / windowHeight;
          const scale = 1 + Math.pow(scrollProgress * 3, 3); 
          const opacity = 1 - (scrollProgress * 2.5);
          
          section.style.opacity = Math.max(0, opacity).toString();
          section.style.transform = "scale(" + scale + ")";
          return; 
        }

        // Standard fade/slide effect for other sections
        const opacity = 1 - Math.min(Math.abs(normalizedDistance * 1.5), 1);
        const translateY = normalizedDistance * 100;
        
        section.style.opacity = Math.max(0, opacity).toString();
        section.style.transform = "translateY(" + translateY + "px)";

        // Special Stats Animation for Scene 4 (Index 3)
        if (index === 3 && Math.abs(normalizedDistance) < 0.2) {
            const liveEl = liveDataRef.current;
            if (liveEl && liveEl.getAttribute('data-animated') !== 'true') {
              liveEl.setAttribute('data-animated', 'true');
              
              const startTime = performance.now();
              const duration = 1200; 
              
              const animateStats = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const p = Math.min(elapsed / duration, 1);
                const timeEase = 1 - Math.pow(1 - p, 4);
                
                if (liveDataRef.current) {
                  liveDataRef.current.textContent = Math.floor(timeEase * 1000).toString();
                }
                if (efficiencyRef.current) {
                  efficiencyRef.current.textContent = Math.floor(timeEase * 3).toString();
                }
                
                if (p < 1) {
                  requestAnimationFrame(animateStats);
                }
              };
              requestAnimationFrame(animateStats);
            }
        } else {
          // Reset numbers when completely out of view
          if (index === 3 && Math.abs(normalizedDistance) >= 0.8) {
            if (liveDataRef.current) liveDataRef.current.textContent = "0";
            if (efficiencyRef.current) efficiencyRef.current.textContent = "0";
            if (liveDataRef.current) liveDataRef.current.setAttribute('data-animated', 'false');
          }
        }
      });

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <main ref={containerRef} className="relative w-full bg-black text-white selection:bg-jantsa-red selection:text-white cursor-default" style={{ height: "600vh" }}>
      
      {/* Loading Overlay */}
      {imagesLoaded < FRAME_COUNT && (
        <div className="fixed inset-0 z-[100] bg-jantsa-black flex flex-col items-center justify-center text-white transition-opacity duration-500">
          <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-jantsa-red transition-all duration-300 ease-out"
              style={{ width: ((imagesLoaded / FRAME_COUNT) * 100) + '%' }}
            />
          </div>
          <div className="text-xs font-bold tracking-[0.2em] animate-pulse">
            SİSTEM BAŞLATILIYOR...
          </div>
        </div>
      )}

      {/* Fixed Canvas Background */}
      <div id="canvas-wrapper" className="fixed top-0 left-0 w-full h-[100vh] z-0 bg-jantsa-black transition-all duration-700 ease-out">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          style={{ filter: 'contrast(1.08) saturate(1.15) brightness(1.05)' }} 
        />
        
        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(10,10,10,0.9)_100%)] pointer-events-none" />
        
        {/* Gradient for text readability on the left */}
        <div className="absolute inset-0 bg-gradient-to-r from-jantsa-black via-jantsa-black/60 to-transparent pointer-events-none w-[80%]" />
      </div>

      {/* Fixed Navigation - Only Logo */}
      <div className="fixed top-8 left-10 z-50 flex flex-col font-black tracking-[0.2em] text-lg leading-none cursor-pointer drop-shadow-2xl">
        <span className="text-white">JANTSA</span>
        <span className="text-jantsa-red mt-1">OPEX</span>
      </div>

      {/* Right Side Progress Navigation */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-6 text-[10px] font-bold tracking-[0.2em] mix-blend-difference w-32">
        {[
          { id: 1, label: 'OPEX NEDİR?' },
          { id: 2, label: 'HEDEFİMİZ' },
          { id: 3, label: 'YAKLAŞIMIMIZ' },
          { id: 4, label: 'ÖDÜLLENDİRME' },
          { id: 5, label: 'KOKPİT' },
          { id: 6, label: '5S OYUNUMUZ' }
        ].map((item) => (
          <div
            key={item.id}
            onClick={() => {
                const container = containerRef.current;
                if (!container) return;
                const maxScroll = container.scrollHeight - window.innerHeight;
                const targetScroll = ((item.id - 1) / 5) * maxScroll;
                window.scrollTo({ top: targetScroll, behavior: 'smooth' });
            }}
            className="cursor-pointer group flex flex-col"
          >
            <div className={`transition-colors duration-500 mb-1 ${activeScene === item.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-400'}`}>
              0{item.id}
            </div>
            <div className="flex items-center">
              <span className={`transition-colors duration-500 whitespace-nowrap ${activeScene === item.id ? 'text-jantsa-red' : 'text-gray-600 group-hover:text-gray-400'}`}>
                {item.label}
              </span>
              <div className={`transition-all duration-700 h-[2px] ml-4 bg-jantsa-red ${activeScene === item.id ? 'w-12 shadow-[0_0_15px_rgba(211,17,69,1)]' : 'w-0'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable Content Layers */}
      <div className="relative z-10 w-full min-h-screen">
        
        {/* Scene 01: INTRO */}
        <section className="h-[100vh] flex flex-col items-center justify-center text-center px-4 relative">
          <div 
            ref={(el) => { sectionRefs.current[0] = el; }} 
            className="max-w-4xl flex flex-col items-center origin-center will-change-transform will-change-opacity"
            style={{ opacity: 1, transform: 'scale(1)' }}
          >
            <div className="inline-flex items-center gap-3 px-5 py-2 mb-6 rounded-full border border-jantsa-red/40 bg-jantsa-red/10 text-jantsa-red text-[10px] md:text-[11px] font-bold tracking-[0.4em] uppercase backdrop-blur-md shadow-[0_0_30px_rgba(211,17,69,0.2)]">
              <span className="w-2 h-2 rounded-full bg-jantsa-red animate-pulse" />
              Jantsa Operasyonel Mükemmellik
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6 leading-[1.1] tracking-tighter">
              <span className="font-light text-gradient block mb-1">FİKİRLERİNİZE</span>
              <span className="font-bold animate-shimmer drop-shadow-[0_0_40px_rgba(255,255,255,0.25)]">DEĞER VERİYORUZ</span>
            </h1>
            <p className="text-sm md:text-lg text-gray-300 max-w-xl font-light leading-relaxed drop-shadow-lg opacity-80">
              Stratejik hedeflerimiz doğrultusunda, mükemmelliğe giden yolda tüm iyileştirme önerilerinizin hayat bulduğu dijital sistem.
            </p>
          </div>
          
          {/* Scroll Down Indicator (Premium Mouse) */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
            <span className="text-[8px] tracking-[0.5em] text-gray-400 mb-1 uppercase">Keşfet</span>
            <div className="w-5 h-8 border-[1.5px] border-gray-400/50 rounded-full flex justify-center p-1 relative overflow-hidden">
              <div className="w-1 h-2 bg-white rounded-full animate-bounce mt-1" />
            </div>
          </div>
        </section>

        {/* Scene 02: GOALS (SÜREKLİ İYİLEŞTİRME) */}
        <section className="h-[100vh] flex items-center px-8 md:px-24">
          <div 
            ref={(el) => { sectionRefs.current[1] = el; }}
            className="max-w-xl will-change-transform will-change-opacity origin-left"
            style={{ opacity: 0, transform: 'translateY(50px)' }}
          >
            <div className="text-jantsa-red text-[10px] md:text-xs font-bold tracking-[0.4em] mb-3 flex items-center gap-4">
              <span className="w-8 h-[2px] bg-jantsa-red" /> 01. HEDEFİMİZ
            </div>
            <h2 className="text-3xl md:text-5xl mb-6 leading-tight transition-all duration-75">
              <span className="font-light tracking-wide text-gray-300">SÜREKLİ İYİLEŞTİRME</span>
              <br />
              <span className="font-bold tracking-tight text-gradient">KÜLTÜRÜ</span>
            </h2>
            <p className="text-sm md:text-base text-gray-400 max-w-md mb-10 font-light leading-relaxed">
              Çalışanlarımızın süreçlere katılımını sağlayarak aidiyeti artırıyor, bilgi birikimini şirket genelinde yaygınlaştırıyor ve pazar rekabetçiliğimizi koruyoruz.
            </p>
            
            {/* OPEX Pillars Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-md">
              {['5S SİSTEMİ', 'KAIZEN A3', '6 SIGMA', 'OTONOM BAKIM'].map((pillar, i) => (
                <div key={i} className="premium-glass rounded-xl p-5 flex flex-col items-start justify-center group hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)] transition-all duration-500 cursor-default relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/10 to-transparent rounded-bl-full transition-all duration-500 group-hover:from-jantsa-red/30" />
                  <span className="text-xl mb-1 opacity-30 font-extralight font-mono transition-opacity duration-500 group-hover:opacity-80">0{i+1}</span>
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/90 group-hover:text-white">{pillar}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scene 03: 8 WASTES (8 İSRAF) */}
        <section className="h-[100vh] flex items-center justify-end px-8 md:px-32 text-right">
          <div 
            ref={(el) => { sectionRefs.current[2] = el; }}
            className="max-w-xl will-change-transform will-change-opacity origin-right"
            style={{ opacity: 0, transform: 'translateY(50px)' }}
          >
            <div className="text-jantsa-red text-[10px] md:text-xs font-bold tracking-[0.4em] mb-3 flex items-center justify-end gap-4">
              02. YAKLAŞIMIMIZ <span className="w-8 h-[2px] bg-jantsa-red" />
            </div>
            <h2 className="text-3xl md:text-5xl mb-5 leading-tight transition-all duration-75">
              <span className="font-light tracking-wide text-gray-300">İSRAFLARI YOK EDEREK</span>
              <br />
              <span className="font-bold tracking-tight text-white drop-shadow-[0_0_20px_rgba(211,17,69,0.3)]">DEĞER YARATIN</span>
            </h2>
            <p className="text-sm md:text-base text-gray-400 max-w-md ml-auto font-light leading-relaxed mb-8">
              İş süreçlerimizde Hatalı Üretim, Bekleme, Taşıma, Fazla İşlem, Hareket, Stok, Kullanılmayan Yaratıcılık ve Fazla Üretimi ortadan kaldırıyoruz.
            </p>
            
            <div className="flex flex-wrap justify-end gap-2 max-w-md ml-auto">
              {['Hatalı Üretim', 'Bekleme', 'Taşıma', 'Fazla İşlem', 'Hareket', 'Stok', 'Yaratıcılık', 'Fazla Üretim'].map((israf, i) => (
                <div key={i} className="bg-white/10 border border-white/30 backdrop-blur-md rounded-full px-4 py-2 text-[10px] md:text-xs font-bold tracking-widest text-white shadow-[0_5px_15px_rgba(0,0,0,0.3)] hover:bg-jantsa-red hover:border-jantsa-red hover:shadow-[0_0_20px_rgba(211,17,69,0.5)] transition-all duration-300 cursor-default hover:-translate-y-1">
                  {israf}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Scene 04: REWARDS (ÖDÜLLENDİRME) */}
        <section className="h-[100vh] flex items-center px-8 md:px-24">
          <div 
            ref={(el) => { sectionRefs.current[3] = el; }}
            className="max-w-xl will-change-transform will-change-opacity origin-left"
            style={{ opacity: 0, transform: 'translateY(50px)' }}
          >
            <div className="text-jantsa-red text-[10px] md:text-xs font-bold tracking-[0.4em] mb-3 flex items-center gap-4">
              <span className="w-8 h-[2px] bg-jantsa-red" /> 03. SİSTEMİMİZ
            </div>
            <h2 className="text-3xl md:text-5xl mb-5 leading-tight transition-all duration-75">
              <span className="font-light tracking-wide text-gray-300">BAŞARIYI</span>
              <br />
              <span className="font-bold tracking-tight text-gradient">ÖDÜLLENDİRİYORUZ</span>
            </h2>
            <p className="text-sm md:text-base text-gray-400 max-w-md font-light leading-relaxed mb-10">
              Tüm çalışanların ulaşabileceği OPEX veri tabanına önerilerinizi ekleyin. İş güvenliği, kalite artışı ve enerji tasarrufu gibi konulardaki fikirleriniz size ödül olarak geri dönsün.
            </p>

            <div className="premium-glass rounded-3xl p-8 flex gap-10 relative overflow-hidden group hover:scale-[1.02] transition-all duration-700">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 group-hover:via-jantsa-red transition-colors duration-700" />
              <div className="absolute inset-0 bg-gradient-to-br from-jantsa-red/5 to-transparent pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative">
                <div className="text-white/40 text-[9px] font-bold tracking-[0.4em] mb-3">MİN. ÖDÜL PUANI</div>
                <div className="text-4xl md:text-5xl font-light tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"><span ref={liveDataRef}>0</span><span className="text-2xl text-jantsa-red ml-1 align-top">+</span></div>
              </div>
              <div className="relative">
                <div className="text-white/40 text-[9px] font-bold tracking-[0.4em] mb-3">DEĞERLENDİRME PERİYODU</div>
                <div className="text-4xl md:text-5xl font-light tracking-tighter text-white flex items-baseline gap-2"><span ref={efficiencyRef}>0</span><span className="text-[10px] font-bold tracking-[0.3em] text-gray-400">AYDA BİR</span></div>
              </div>
            </div>

          </div>
        </section>

        {/* Scene 05: KOKPIT TOPLANTILARI */}
        <section className="h-[100vh] flex items-center justify-start px-8 md:px-24 text-left relative overflow-hidden">
          
          {/* Tabletop Mockup Background Image Overlay */}
          <div 
            className="absolute inset-0 z-0 transition-opacity duration-1000 bg-cover bg-center"
            style={{ 
              opacity: activeScene === 5 ? 1 : 0, 
              backgroundImage: 'url("/kokpit-bg.png")'
            }}
          >
            {/* We no longer need the text gradient because the background image has text baked in */}
          </div>

          <div 
            ref={(el) => { sectionRefs.current[4] = el; }}
            className="max-w-xl will-change-transform will-change-opacity origin-left relative z-10"
            style={{ opacity: 0, transform: 'translateY(50px)' }}
          >
          </div>
        </section>

        {/* Scene 06: MUCIZE BAHCE (GAME) */}
        <section className="h-[100vh] w-full flex flex-col items-center justify-center relative overflow-hidden">
          
          <div 
            ref={(el) => { sectionRefs.current[5] = el; }}
            className="w-full h-full will-change-transform will-change-opacity relative z-10 pointer-events-auto"
            style={{ opacity: 0, transform: 'translateY(50px)' }}
          >
            {/* Full Screen Banner Container */}
            <div className="relative w-full h-full overflow-hidden flex flex-col md:flex-row bg-[#45583b]">
              
              {/* Animated 3D Butterflies Layer */}
              <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden" style={{ perspective: '1000px' }}>
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${10 + Math.random() * 80}%`,
                      animation: `flyButterfly ${15 + Math.random() * 10}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                      animationDelay: `-${Math.random() * 20}s`,
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    <div 
                      className="butterfly-wrapper" 
                      style={{ 
                        transform: `scale(${0.4 + Math.random() * 0.5}) rotateZ(${Math.random() * 360}deg) rotateX(${20 + Math.random() * 40}deg)` 
                      }}
                    >
                      <div className="wing left-wing"></div>
                      <div className="wing right-wing"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CSS Animations defined in a style tag */}
              <style dangerouslySetInnerHTML={{__html: `
                .butterfly-wrapper {
                  position: relative;
                  width: 40px;
                  height: 40px;
                  transform-style: preserve-3d;
                }
                .wing {
                  position: absolute;
                  width: 15px;
                  height: 30px;
                  background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(168, 213, 146, 0.8));
                  border: 1px solid rgba(255,255,255,0.4);
                  border-radius: 50% 10% 50% 30%;
                  box-shadow: inset 0 0 10px rgba(0,0,0,0.1);
                  top: 5px;
                }
                .left-wing {
                  left: 5px;
                  transform-origin: right center;
                  animation: flap-left 0.12s infinite alternate ease-in-out;
                }
                .right-wing {
                  left: 20px;
                  transform-origin: left center;
                  border-radius: 10% 50% 30% 50%;
                  background: linear-gradient(225deg, rgba(255,255,255,0.9), rgba(168, 213, 146, 0.8));
                  animation: flap-right 0.12s infinite alternate ease-in-out;
                }
                @keyframes flap-left { 
                  0% { transform: rotateY(0deg); } 
                  100% { transform: rotateY(65deg); } 
                }
                @keyframes flap-right { 
                  0% { transform: rotateY(0deg); } 
                  100% { transform: rotateY(-65deg); } 
                }
                @keyframes flyButterfly {
                  0% { transform: translate(0, 0) translateZ(0); }
                  20% { transform: translate(-100px, -50px) translateZ(100px); }
                  40% { transform: translate(-50px, -150px) translateZ(20px); }
                  60% { transform: translate(80px, -100px) translateZ(150px); }
                  80% { transform: translate(50px, 20px) translateZ(50px); }
                  100% { transform: translate(0, 0) translateZ(0); }
                }
              `}} />

              {/* Left Content */}
              <div className="p-10 md:p-24 lg:p-32 flex flex-col justify-center w-full md:w-1/2 h-full z-10 bg-gradient-to-r from-[#45583b] via-[#45583b]/95 to-transparent relative">
                <h2 className="text-4xl md:text-6xl lg:text-7xl mb-6 font-bold text-white tracking-tight drop-shadow-lg">
                  MUCİZE BAHÇE
                </h2>
                <p className="text-base md:text-xl text-[#a8d592] font-semibold mb-4 tracking-wide">
                  Düzenle, dönüştür, büyüt!
                </p>
                <p className="text-sm md:text-lg text-white/80 font-light mb-12 max-w-md leading-relaxed">
                  Kendi bahçeni oluştur ve sürdürülebilir bir iyileştirme kültürü inşa et.
                </p>
                
                <a 
                  href="/game.html" 
                  target="_blank" 
                  className="bg-white text-black px-10 py-5 rounded-2xl font-bold tracking-[0.15em] text-xs md:text-sm transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-[0_0_40px_rgba(168,213,146,0.5)] flex items-center gap-4 w-max group"
                >
                  TAM EKRAN OYNA
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-300"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><path d="M15 13h.01"/><path d="M18 11h.01"/></svg>
                </a>
              </div>

              {/* Right Image */}
              <div className="w-full md:w-1/2 h-1/2 md:h-full relative overflow-hidden">
                <img 
                  src="/garden.jpg" 
                  alt="Mucize Bahçe" 
                  className="absolute inset-0 w-full h-full object-cover object-center transform scale-110 hover:scale-100 transition-transform duration-[3000ms] ease-out"
                />
                {/* Gradient blend edge for seamless transition on desktop */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#45583b] via-[#45583b]/60 to-transparent w-48 hidden md:block" />
                {/* Gradient blend edge for seamless transition on mobile */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#45583b] via-[#45583b]/80 to-transparent h-32 md:hidden block" />
              </div>

            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
