import React from 'react';
import { Mic, Square, Play, CheckCircle } from 'lucide-react';
import { WORKER_PRESETS, JOB_PRESETS } from './presets';

export const VoiceAssistant = ({
  isRecording,
  speechText,
  recognizedEntities,
  speechActiveSection,
  setSpeechActiveSection,
  visualizerRef,
  handleToggleSpeech,
  runSimulatedSpeech,
  applyVoiceEntities,
  logSystem
}) => {
  const currentPresets = speechActiveSection === 'worker' ? WORKER_PRESETS : JOB_PRESETS;

  return (
    <div className="glass p-6 rounded-3xl border border-emerald-100 shadow-md mb-8">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <Mic className="text-emerald-600 animate-bounce" size={20} />
            🎙️ KissanShakthi Speech Auto-Filler
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Speak to pre-fill standard form fields automatically. Uses rule-based AI keyword extraction!
          </p>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setSpeechActiveSection('worker')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                speechActiveSection === 'worker' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Worker Registration Mode
            </button>
            <button 
              onClick={() => setSpeechActiveSection('job')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                speechActiveSection === 'job' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Task Posting Mode
            </button>
          </div>
        </div>

        {/* Action and waveform visualizer */}
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <canvas 
            ref={visualizerRef}
            width="180" 
            height="45" 
            className="rounded-xl bg-slate-950 border border-slate-900 h-[45px] w-full md:w-[180px] shadow-inner"
          ></canvas>

          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => handleToggleSpeech(logSystem)}
              className={`flex-grow md:flex-grow-0 px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10'
              }`}
            >
              {isRecording ? <Square size={13} /> : <Mic size={13} />}
              <span>{isRecording ? 'Stop Recording' : 'Speak Live'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Presets and Speech outputs */}
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Voice simulation triggers */}
        <div>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">
            🚀 Farmer Speech Simulations (Preset Testers):
          </span>
          <div className="space-y-2">
            {currentPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => runSimulatedSpeech(preset, logSystem)}
                disabled={isRecording}
                className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/10 text-xs font-semibold text-slate-700 flex items-center gap-2 cursor-pointer transition-all duration-200"
              >
                <Play size={10} className="text-emerald-600 flex-shrink-0" />
                <span className="truncate">"{preset}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transcription and Entities Output card */}
        <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
              Speech AI Transcription Results:
            </span>
            <p className="text-xs font-bold text-slate-800 mt-1 italic min-h-[1.5rem]">
              {speechText ? `"${speechText}"` : (isRecording ? 'Listening and translating...' : 'Speak live or trigger simulation preset above...')}
            </p>

            {/* Entity display */}
            {recognizedEntities && (
              <div className="mt-3 p-3 bg-white border border-emerald-100 rounded-xl space-y-1.5">
                <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block">
                  ✨ Parsed Metadata Extraction:
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {speechActiveSection === 'worker' ? (
                    <>
                      {recognizedEntities.name && (
                        <div><strong className="text-slate-500">Name:</strong> <span className="text-slate-900 font-bold">{recognizedEntities.name}</span></div>
                      )}
                      {recognizedEntities.phone && (
                        <div><strong className="text-slate-500">Phone:</strong> <span className="text-slate-900 font-bold">{recognizedEntities.phone}</span></div>
                      )}
                      {recognizedEntities.rate && (
                        <div><strong className="text-slate-500">Wage:</strong> <span className="text-emerald-700 font-bold">₹{recognizedEntities.rate}/day</span></div>
                      )}
                      {recognizedEntities.skills.length > 0 && (
                        <div className="col-span-2">
                          <strong className="text-slate-500">Skills:</strong> <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold inline-block ml-1">{recognizedEntities.skills.join(', ')}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {recognizedEntities.title && (
                        <div className="col-span-2"><strong className="text-slate-500">Task Title:</strong> <span className="text-slate-900 font-bold">"{recognizedEntities.title}"</span></div>
                      )}
                      {recognizedEntities.location && (
                        <div><strong className="text-slate-500">Location:</strong> <span className="text-slate-900 font-bold">{recognizedEntities.location}</span></div>
                      )}
                      {recognizedEntities.rate && (
                        <div><strong className="text-slate-500">Payout:</strong> <span className="text-emerald-700 font-bold">₹{recognizedEntities.rate}</span></div>
                      )}
                      {recognizedEntities.skills.length > 0 && (
                        <div className="col-span-2">
                          <strong className="text-slate-500">Skill:</strong> <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold inline-block ml-1">{recognizedEntities.skills[0]}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {recognizedEntities && (
            <button 
              onClick={applyVoiceEntities}
              className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <CheckCircle size={12} />
              <span>Auto-Fill {speechActiveSection === 'worker' ? 'Laborer' : 'Task'} Form</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
