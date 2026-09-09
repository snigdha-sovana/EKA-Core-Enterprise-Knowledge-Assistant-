import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  FileEdit,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';

export default function KnowledgeGaps() {
  const { knowledgeGaps, addToast } = useApp();
  const [filterDept, setFilterDept] = useState<string>('All');
  const [draftedGaps, setDraftedGaps] = useState<string[]>([]);

  const filtered = knowledgeGaps.filter(gap => {
    if (filterDept === 'All') return true;
    return gap.responsibleDept.includes(filterDept);
  });

  const handleGenerateDraft = (id: string, topic: string) => {
    setDraftedGaps(prev => (prev.includes(id) ? prev : [...prev, id]));
    addToast({
      title: 'Policy Amendment Drafted',
      message: `Generated candidate draft for "${topic}". Sent to department lead for ratification.`,
      type: 'success',
    });
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            Active Policy Deficits
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Gap Analytics</h1>
          <p className="text-sm text-slate-500">
            AI-detected queries resulting in abstention or frequent escalation, mapped to actionable policy revisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            {knowledgeGaps.length} Actionable Clusters
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm">
        <span className="text-xs font-semibold text-slate-500 mr-2">Department:</span>
        {['All', 'Finance', 'HR', 'Projects'].map(dept => (
          <button
            key={dept}
            onClick={() => setFilterDept(dept)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterDept === dept
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Gap Cards */}
      <div className="space-y-4">
        {filtered.map((gap, index) => {
          const isDrafted = draftedGaps.includes(gap.id);

          return (
            <div
              key={gap.id}
              className="enterprise-card p-5 space-y-4 border-l-4 border-l-amber-500 hover:shadow-md transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                    #{index + 1}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{gap.topic}</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {gap.responsibleDept}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <span className="font-bold text-slate-900">{gap.queriesCount}</span>
                    <span className="text-slate-400 ml-1">Queries</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-600">{gap.escalationsCount}</span>
                    <span className="text-slate-400 ml-1">Escalations</span>
                  </div>
                </div>
              </div>

              {/* Sample Query */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Representative Employee Query
                </div>
                <div className="italic text-slate-700">"{gap.sampleQuery}"</div>
              </div>

              {/* Recommendation Box */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Recommended Policy Amendment
                  </div>
                  <p className="text-xs text-emerald-800">{gap.recommendation}</p>
                </div>

                <button
                  onClick={() => handleGenerateDraft(gap.id, gap.topic)}
                  className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-all ${
                    isDrafted
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100/50'
                  }`}
                >
                  {isDrafted ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      Draft Created v3.3-draft
                    </>
                  ) : (
                    <>
                      <FileEdit className="w-3.5 h-3.5" />
                      Generate Policy Draft
                    </>
                  )}
                </button>
              </div>

              {/* Coverage Score */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                <span>Current Policy Grounding Score:</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${gap.coverageScore}%` }}
                    ></div>
                  </div>
                  <span className="font-bold text-slate-700">{gap.coverageScore}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
