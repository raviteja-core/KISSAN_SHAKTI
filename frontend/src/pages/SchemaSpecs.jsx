import React from 'react';
import { Database, ArrowRightLeft, Users, Briefcase, Search, FileCode } from 'lucide-react';

export const SchemaSpecs = () => {
  return (
    <div className="glass p-8 rounded-3xl shadow-sm border border-emerald-100/50 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="text-emerald-600" size={24} />
            KissanShakthi Locked Specifications
          </h2>
          <p className="text-sm text-slate-500 font-medium">Locked JSON payload contracts between local memory ORM and remote servers</p>
        </div>
        <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border border-slate-200 select-none">
          <ArrowRightLeft size={14} className="text-slate-400" />
          <span>JSON Payload Locks</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Registrations */}
        <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs mb-3 uppercase tracking-wider">
            <Users size={15} />
            POST /api/workers/register
          </div>
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Request Payload Shape:</span>
            <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[9px] font-mono leading-relaxed overflow-x-auto max-h-36 shadow-inner">
{`{
  "id": "UUID-String",
  "name": "Suresh Patil",
  "phone": "+91 91234 56789",
  "skills": ["Harvesting"],
  "daily_rate": 450,
  "status": "active"
}`}
            </pre>
          </div>
        </div>

        {/* Card 2: Post Job */}
        <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs mb-3 uppercase tracking-wider">
            <Briefcase size={15} />
            POST /api/jobs/post
          </div>
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Request Payload Shape:</span>
            <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[9px] font-mono leading-relaxed overflow-x-auto max-h-36 shadow-inner">
{`{
  "id": "UUID-String",
  "title": "Wheat Harvesting",
  "description": "2 acres wheat field...",
  "location": "Sinnar Region",
  "payment": 1200,
  "worker_id": null
}`}
            </pre>
          </div>
        </div>

        {/* Card 3: Matching Queries */}
        <div className="bg-slate-50 border border-slate-200/50 p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs mb-3 uppercase tracking-wider">
            <Search size={15} />
            GET /api/jobs/{"{job_id}"}/match
          </div>
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Response Matches List Shape:</span>
            <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-[9px] font-mono leading-relaxed overflow-x-auto max-h-36 shadow-inner">
{`{
  "job_id": "UUID-String",
  "matches": [
    {
      "worker_id": "UUID-String",
      "name": "Suresh Patil",
      "phone": "+91 91234 56789",
      "skills": ["Harvesting"],
      "daily_rate": 450,
      "match_score": 100
    }
  ]
}`}
            </pre>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 font-semibold flex items-center gap-2">
        <FileCode size={15} />
        <span>Conventions logged inside <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">db-conventions.md</code> inside frontend folder</span>
      </div>
    </div>
  );
};
