import { useState, useEffect, useRef } from 'react';
import { parseSpeechText } from './speechParser';
import { WORKER_PRESETS, JOB_PRESETS } from './presets';

export const useSpeechAssistant = (activeTab) => {
  const [isRecording, setIsRecording] = useState(false);
  const [speechText, setSpeechText] = useState('');
  const [recognizedEntities, setRecognizedEntities] = useState(null);
  const [speechActiveSection, setSpeechActiveSection] = useState('worker'); // 'worker' or 'job'

  const visualizerRef = useRef(null);
  const recognitionRef = useRef(null);
  const simulationTimeoutRef = useRef(null);

  const runLiveSpeech = (logSystem) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      logSystem('warn', 'Web Speech API is not supported in this browser. Initiating auto voice preset simulator...');
      runSimulatedSpeech(speechActiveSection === 'worker' ? WORKER_PRESETS[0] : JOB_PRESETS[0], logSystem);
      return;
    }

    setIsRecording(true);
    setSpeechText('');
    setRecognizedEntities(null);
    logSystem('info', 'Microphone recording active. Canvas wave visualizer listening...');

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const textTranscribed = event.results[0][0].transcript;
      setSpeechText(textTranscribed);
      logSystem('success', `Voice recognized: "${textTranscribed}"`);
      
      const entities = parseSpeechText(textTranscribed);
      setRecognizedEntities(entities);
      logSystem('info', `Voice AI Parsed: ${JSON.stringify(entities)}`);
    };

    recognition.onerror = (e) => {
      logSystem('error', `Speech engine error: ${e.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const runSimulatedSpeech = (text, logSystem) => {
    setIsRecording(true);
    setSpeechText('');
    setRecognizedEntities(null);
    logSystem('info', `Simulating speech input transcription: "${text}"`);

    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
    }

    simulationTimeoutRef.current = setTimeout(() => {
      setIsRecording(false);
      setSpeechText(text);
      
      const entities = parseSpeechText(text);
      setRecognizedEntities(entities);
      logSystem('success', `Simulated Voice AI Transcription complete.`);
      simulationTimeoutRef.current = null;
    }, 1800);
  };

  const handleToggleSpeech = (logSystem) => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        logSystem('info', 'Microphone recording stopped manually by user.');
      }
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
        simulationTimeoutRef.current = null;
        setIsRecording(false);
        logSystem('info', 'Speech simulation stopped manually.');
      }
    } else {
      runLiveSpeech(logSystem);
    }
  };

  const clearRecognizedEntities = () => {
    setSpeechText('');
    setRecognizedEntities(null);
  };

  // Canvas Visualizer Permanent Animation Loop
  useEffect(() => {
    const canvas = visualizerRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let offset = 0;
    
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;
    let source = null;
    let stream = null;

    if (isRecording) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(s => {
            stream = s;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            source = audioCtx.createMediaStreamSource(stream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 128;
            source.connect(analyser);
            
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            const drawLive = () => {
              animationId = requestAnimationFrame(drawLive);
              analyser.getByteFrequencyData(dataArray);
              
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              ctx.lineWidth = 3;
              ctx.strokeStyle = '#10b981';
              ctx.beginPath();
              
              const sliceWidth = canvas.width / bufferLength;
              let drawX = 0;
              
              for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;
                
                if (i === 0) ctx.moveTo(drawX, y);
                else ctx.lineTo(drawX, y);
                
                drawX += sliceWidth;
              }
              ctx.lineTo(canvas.width, canvas.height / 2);
              ctx.stroke();
            };
            drawLive();
          })
          .catch(() => {
            const drawSimulatedActive = () => {
              animationId = requestAnimationFrame(drawSimulatedActive);
              
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              ctx.lineWidth = 2.5;
              ctx.strokeStyle = '#10b981';
              ctx.beginPath();
              
              for (let i = 0; i < canvas.width; i++) {
                const y = canvas.height / 2 + Math.sin(i * 0.08 + offset) * 14 * Math.sin(offset * 0.2);
                if (i === 0) ctx.moveTo(i, y);
                else ctx.lineTo(i, y);
              }
              ctx.stroke();
              offset += 0.18;
            };
            drawSimulatedActive();
          });
      } else {
        const drawSimulatedActive = () => {
          animationId = requestAnimationFrame(drawSimulatedActive);
          
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#10b981';
          ctx.beginPath();
          
          for (let i = 0; i < canvas.width; i++) {
            const y = canvas.height / 2 + Math.sin(i * 0.08 + offset) * 14 * Math.sin(offset * 0.2);
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
          ctx.stroke();
          offset += 0.18;
        };
        drawSimulatedActive();
      }
    } else {
      const drawIdle = () => {
        animationId = requestAnimationFrame(drawIdle);
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#10b98133';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
 
        ctx.strokeStyle = '#10b98177';
        ctx.beginPath();
        for (let i = 0; i < canvas.width; i++) {
          const y = canvas.height / 2 + Math.sin(i * 0.04 + offset) * 3;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
        offset += 0.04;
      };
      drawIdle();
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, [isRecording, activeTab]);

  return {
    isRecording,
    speechText,
    recognizedEntities,
    speechActiveSection,
    setSpeechActiveSection,
    visualizerRef,
    runSimulatedSpeech,
    handleToggleSpeech,
    clearRecognizedEntities,
    setRecognizedEntities
  };
};
