import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User as UserIcon,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  CheckCircle2,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { EkaMessage } from '../../mock/mockData';
import { SourceCitationCard } from './SourceCitationCard';
import { EscalationCard } from './EscalationCard';
import apiService from '../../services/api';

interface EkaChatPanelProps {
  isFullPage?: boolean;
}

const DEFAULT_SUGGESTED_CHIPS = [
  'How many leaves do I have?',
  'What is the reimbursement policy for international travel?',
  'Can I claim accommodation above the normal limit for a client visit next month?',
  'What is the release process for Orion?',
];

export const EkaChatPanel: React.FC<EkaChatPanelProps> = ({ isFullPage = false }) => {
  const {
    ekaFloatingOpen,
    setEkaFloatingOpen,
    activeEkaQuery,
    setActiveEkaQuery,
    requests,
    ragLearnedChunks,
    fastForwardSync,
    resetSimulation,
  } = useApp();
  const navigate = useNavigate();
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Determine active RAG learning chunk state for accommodation exception
  const accommodationChunk = ragLearnedChunks.find(
    c => c.requestId === 'FIN-2026-0142' || c.query.toLowerCase().includes('accommodation')
  );
  const isAccommodationSynced = accommodationChunk?.status === 'synced';
  const isAccommodationIngesting = accommodationChunk?.status === 'ingesting';
  const isAccommodationPending = !accommodationChunk || accommodationChunk.status === 'pending_admin';

  // Initial greeting message
  const [messages, setMessages] = useState<EkaMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'eka',
      text: 'Hello Snigdha! I am EKA, your AI assistant embedded in NexoraERP. I can help you check leave balances, understand travel reimbursement caps, look up Project Orion documentation, or escalate unanswered questions to department administrators.',
      timestamp: 'Just now',
    },
  ]);

  // Handle queries passed from search bar or quick action chips
  useEffect(() => {
    if (activeEkaQuery) {
      handleSendQuery(activeEkaQuery);
      setActiveEkaQuery('');
    }
  }, [activeEkaQuery]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendQuery = async (textToSend: string) => {
    const q = textToSend.trim();
    if (!q) return;

    // 1. Append user message
    const userMsg: EkaMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: 'Just now',
    };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    const lowerQ = q.toLowerCase();

    // 1. Accommodation / Client Visit Limit Query (The Core Continuous Learning Loop)
    if (
      lowerQ.includes('accommodation') ||
      lowerQ.includes('normal limit') ||
      lowerQ.includes('client visit next month')
    ) {
      setTimeout(() => {
        setIsTyping(false);

        if (isAccommodationSynced) {
          // RAG MODEL HAS LEARNED! The Admin resolved on ERP and vector sync finished.
          const resolutionText =
            accommodationChunk?.responseSnippet ||
            'Approved exception: Hotel accommodation up to $280/night is permitted for verified Tier-1 client visits exceeding 3 days with VP prior email signoff.';

          const ekaMsg: EkaMessage = {
            id: `eka-${Date.now()}`,
            sender: 'eka',
            text: `Yes, you can claim accommodation above the normal limit for your client visit!\n\nAccording to the updated **Travel & Reimbursement Policy v3.3** (autonomously learned and indexed from Finance Admin's resolution of ticket **FIN-2026-0142** on NexoraERP):\n\n• **Approved Hotel Exception**: Lodging up to **$280/night** is approved for designated client on-site visits where preferred corporate hotels exceed standard limits.\n• **Required Authorization**: Prior written VP email authorization must be attached to your NexoraERP expense voucher.\n• **Standard Allowances**: Flat $150/day per-diem covering meals and local cab transit remains active.`,
            timestamp: 'Just now',
            confidence: 'High',
            isLearnedFromResolution: true,
            resolvedRequestId: 'FIN-2026-0142',
            sources: [
              {
                documentId: 'doc-travel-32',
                documentTitle: 'Travel & Reimbursement Policy v3.3',
                department: 'Finance',
                version: 'v3.3',
                confidence: 'High',
                excerpt: `Section 4. Client On-Site Exception Clause (Amended): ${resolutionText}`,
              },
            ],
          };
          setMessages(prev => [...prev, ekaMsg]);
        } else if (isAccommodationIngesting) {
          // Simulation countdown in progress
          const countdown = accommodationChunk?.countdownSeconds || 3;
          const ekaMsg: EkaMessage = {
            id: `eka-${Date.now()}`,
            sender: 'eka',
            text: `⚡ **RAG Model Ingestion in Progress**:\n\nFinance Lead Priya Sharma has approved this exception under ticket **FIN-2026-0142** on NexoraERP!\n\nThe continuous learning pipeline is currently generating vector embeddings and synchronizing the new chunk into ChromaDB.\n\nIndexing countdown: **${countdown} seconds remaining**. Once indexed, EKA will answer this question directly with high confidence without creating a request!`,
            timestamp: 'Just now',
            confidence: 'Needs Review',
            sources: [
              {
                documentId: 'doc-travel-32',
                documentTitle: 'Travel & Reimbursement Policy v3.3 (Syncing)',
                department: 'Finance',
                version: 'v3.3-ingesting',
                confidence: 'Needs Review',
                excerpt: 'Vector pipeline ingesting exception resolution from ticket FIN-2026-0142...',
              },
            ],
          };
          setMessages(prev => [...prev, ekaMsg]);
        } else {
          // Prior to resolution: EKA visibly abstains and provides the "Request Finance Review" button
          const ekaMsg: EkaMessage = {
            id: `eka-${Date.now()}`,
            sender: 'eka',
            text: "I couldn't find enough information in the available Finance policies to answer this confidently. While Section 2.3 of the Travel & Reimbursement Policy v3.2 specifies standard hotel ceilings ($200/night for London/NY/SF), it does not document accommodation exceptions for high-priority client on-site visits.",
            timestamp: 'Just now',
            confidence: 'Insufficient Evidence',
            isAbstention: true,
            escalationDept: 'Finance',
            escalationQuery: q,
            associatedRequestId: 'FIN-2026-0142',
          };
          setMessages(prev => [...prev, ekaMsg]);
        }
      }, 700);
      return;
    }

    // 2. Orion Read-Replica Credentials Query
    if (
      (lowerQ.includes('replica') || lowerQ.includes('read-replica')) &&
      (lowerQ.includes('credentials') || lowerQ.includes('latency') || lowerQ.includes('debugging'))
    ) {
      const resolvedOrionReq = requests.find(
        r =>
          (r.id === 'ORION-2026-0045' || r.query.toLowerCase().includes('replica')) &&
          r.status === 'Resolved'
      );

      setTimeout(() => {
        setIsTyping(false);
        if (resolvedOrionReq) {
          const resolutionText =
            resolvedOrionReq.response ||
            "Engineers can assume AWS IAM STS role 'OrionReadReplicaDebugRole' for 2-hour temporary debugging sessions upon Principal Lead consent.";

          const ekaMsg: EkaMessage = {
            id: `eka-${Date.now()}`,
            sender: 'eka',
            text: `Here is the authorized process for obtaining temporary read-replica credentials (updated from **${resolvedOrionReq.id}** resolution):\n\n• **AWS IAM Role**: Engineers can assume AWS IAM STS role \`OrionReadReplicaDebugRole\`.\n• **Session Limit**: Maximum 2-hour TTL session token.\n• **Audit Logging**: All queries are recorded in CloudWatch audit streams.\n• **Approval**: Requires Principal Lead (Rohan Kapoor) consent in Slack #orion-ops.`,
            timestamp: 'Just now',
            confidence: 'High',
            isLearnedFromResolution: true,
            resolvedRequestId: resolvedOrionReq.id,
            sources: [
              {
                documentId: 'doc-orion-runbook',
                documentTitle: 'Project Orion Architecture & Runbook v2.5',
                department: 'Projects',
                version: 'v2.5',
                confidence: 'High',
                excerpt: `SOP 5.2: ${resolutionText}`,
              },
            ],
          };
          setMessages(prev => [...prev, ekaMsg]);
        } else {
          const ekaMsg: EkaMessage = {
            id: `eka-${Date.now()}`,
            sender: 'eka',
            text: "Elevated read-replica credentials require explicit Principal Lead authorization under Project Orion security isolation standards. Would you like to submit a request to Rohan Kapoor?",
            timestamp: 'Just now',
            confidence: 'Insufficient Evidence',
            isAbstention: true,
            escalationDept: 'Projects',
            escalationQuery: q,
          };
          setMessages(prev => [...prev, ekaMsg]);
        }
      }, 700);
      return;
    }

    // Try live FastAPI RAG pipeline
    try {
      const liveRes = await apiService.queryRAG(q);
      if (liveRes && liveRes.answer) {
        setIsTyping(false);

        if (liveRes.abstained) {
          const ekaMsg: EkaMessage = {
            id: `eka-${Date.now()}`,
            sender: 'eka',
            text: liveRes.answer,
            timestamp: 'Just now',
            confidence: 'Insufficient Evidence',
            isAbstention: true,
            escalationDept: 'Finance',
            escalationQuery: q,
          };
          setMessages(prev => [...prev, ekaMsg]);
          return;
        }

        const ekaMsg: EkaMessage = {
          id: `eka-${Date.now()}`,
          sender: 'eka',
          text: liveRes.answer,
          timestamp: 'Just now',
          confidence: 'High',
          sources: liveRes.citations.map(c => ({
            documentId: c.chunk_id,
            documentTitle: c.filename || 'Enterprise Knowledge Base',
            department: 'General',
            version: 'v1.0',
            confidence: 'High',
            excerpt: c.text_snippet,
          })),
        };
        setMessages(prev => [...prev, ekaMsg]);
        return;
      }
    } catch {
      // Fall through to deterministic local responses
    }

    // Deterministic enterprise local fallback
    setTimeout(() => {
      setIsTyping(false);

      if (lowerQ.includes('reimbursement') || lowerQ.includes('travel') || lowerQ.includes('international travel')) {
        const ekaMsg: EkaMessage = {
          id: `eka-${Date.now()}`,
          sender: 'eka',
          text: 'According to the Finance Travel Policy (v3.2), the overseas reimbursement guidelines are structured as follows:\n\n• Economy Class flights are approved for flights under 8 hours. Flights exceeding 8 hours permit Premium Economy.\n• Hotel Lodging Ceilings: Up to $200/night in Tier-1 global metro cities (London, NY, SF, Tokyo), and up to $150/night for other locations.\n• Daily Per-Diem: $150/day flat allowance covering meals and local transit.',
          timestamp: 'Just now',
          confidence: 'High',
          sources: [
            {
              documentId: 'doc-travel-32',
              documentTitle: 'Travel & Reimbursement Policy v3.2',
              department: 'Finance',
              version: 'v3.2',
              confidence: 'High',
              excerpt: 'Domestic Travel: Flat ₹3,500/day. International Travel: Flights over 8 hours permit Premium Economy. Hotel ceiling: $200/night Tier-1 metro cities.',
            },
          ],
        };
        setMessages(prev => [...prev, ekaMsg]);
      } else if (lowerQ.includes('leave') || lowerQ.includes('leaves') || lowerQ.includes('holiday')) {
        const ekaMsg: EkaMessage = {
          id: `eka-${Date.now()}`,
          sender: 'eka',
          text: 'Here is your current leave entitlement according to your NexoraERP employee profile:\n\n• Privilege Leave (PL): 14 days remaining (of 18 annual quota)\n• Casual & Sick Leave (SL): 8 days remaining (of 12 annual quota)\n• Optional Festival Holidays: 2 days remaining (of 4 annual quota)\n\nYou also have 1 pending leave application submitted for September 18–19 currently awaiting manager review.',
          timestamp: 'Just now',
          confidence: 'High',
          sources: [
            {
              documentId: 'doc-leave-40',
              documentTitle: 'Leave & Attendance Policy v4.0',
              department: 'HR',
              version: 'v4.0',
              confidence: 'High',
              excerpt: 'Full-time employees receive 18 days Privilege Leave and 12 days Casual/Sick Leave per calendar year. Core collaboration hours: 10:00 AM - 4:00 PM.',
            },
          ],
        };
        setMessages(prev => [...prev, ekaMsg]);
      } else if (lowerQ.includes('orion') || lowerQ.includes('release') || lowerQ.includes('uat')) {
        const ekaMsg: EkaMessage = {
          id: `eka-${Date.now()}`,
          sender: 'eka',
          text: 'According to the Project Orion Release & Runbook (v1.8):\n\n• Production releases occur on Tuesdays at 10:00 PM IST.\n• Automated canary routing checks 1% traffic for 30 minutes.\n• Rollback automatically triggers if 5xx HTTP errors exceed 0.8% over 3 minutes.\n• Phase 1 UAT is scheduled to commence on October 15, 2026.',
          timestamp: 'Just now',
          confidence: 'High',
          sources: [
            {
              documentId: 'doc-orion-runbook',
              documentTitle: 'Project Orion Release & Incident Runbook',
              department: 'Projects',
              version: 'v1.8',
              confidence: 'High',
              excerpt: 'Production deployments scheduled on Tuesdays at 10:00 PM IST. Rollback initiates if 5xx error rate exceeds 0.8%.',
            },
          ],
        };
        setMessages(prev => [...prev, ekaMsg]);
      } else {
        const ekaMsg: EkaMessage = {
          id: `eka-${Date.now()}`,
          sender: 'eka',
          text: `I searched the NexoraERP knowledge base for "${q}". While I found related enterprise records, I recommend checking the specific company policy documentation or submitting an inquiry to the department administrator.`,
          timestamp: 'Just now',
          confidence: 'Needs Review',
          sources: [
            {
              documentId: 'doc-code-conduct',
              documentTitle: 'Employee Handbook & Code of Conduct',
              department: 'HR',
              version: 'v5.1',
              confidence: 'Needs Review',
              excerpt: 'Company procedures and administrative escalation hierarchy for unclassified queries.',
            },
          ],
        };
        setMessages(prev => [...prev, ekaMsg]);
      }
    }, 700);
  };

  if (!isFullPage && !ekaFloatingOpen) {
    return null;
  }

  const containerClasses = isFullPage
    ? 'flex flex-col h-[calc(100vh-8rem)] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden'
    : 'fixed bottom-6 right-6 w-[440px] h-[640px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200';

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="bg-gradient-to-r from-eka-600 via-indigo-600 to-erp-700 p-4 text-white flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center ring-1 ring-white/30">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight flex items-center gap-2">
              <span>EKA Assistant</span>
              <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded font-mono uppercase tracking-wider font-semibold">
                AI Colleague
              </span>
            </div>
            <div className="text-[11px] text-white/80 mt-0.5">
              Answers, insights & policy guidance
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isFullPage && (
            <button
              onClick={() => {
                setEkaFloatingOpen(false);
                navigate('/app/eka/chat');
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Expand to Full Page"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}

          {!isFullPage ? (
            <button
              onClick={() => setEkaFloatingOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setMessages([messages[0]]);
              }}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors flex items-center gap-1 text-xs"
              title="New Chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-xs">New Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* RAG Continuous Learning Simulation Banner */}
      {isAccommodationIngesting && (
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 text-white px-4 py-2.5 flex items-center justify-between shadow-xs border-b border-indigo-700/50 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="w-4 h-4 animate-spin shrink-0 text-amber-300" />
            <div>
              <span className="font-bold">⚡ RAG Learning Pipeline Ingesting: </span>
              <span className="text-white/90">Embedding ticket FIN-2026-0142 into vector space ({accommodationChunk?.countdownSeconds}s remaining)...</span>
            </div>
          </div>
          <button
            onClick={() => fastForwardSync('FIN-2026-0142')}
            className="text-[10px] font-bold bg-white/20 hover:bg-white text-white hover:text-purple-700 px-2.5 py-1 rounded-full border border-white/40 transition-all shrink-0 ml-2 cursor-pointer"
          >
            Fast-Forward Sync ⚡
          </button>
        </div>
      )}

      {isAccommodationSynced && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 flex items-center justify-between shadow-xs border-b border-emerald-700/50 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
            <div>
              <span className="font-bold">✨ RAG Model Synced: </span>
              <span className="text-emerald-100">Vector memory incorporates resolution from FIN-2026-0142 (Policy v3.3). Ask below to verify!</span>
            </div>
          </div>
          <button
            onClick={resetSimulation}
            className="text-[10px] font-semibold text-emerald-100 hover:text-white underline ml-2 shrink-0 cursor-pointer"
            title="Reset simulation to pre-learning baseline"
          >
            ↺ Reset
          </button>
        </div>
      )}

      {isAccommodationPending && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2 flex items-center justify-between text-amber-900 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              <strong>Policy Gap:</strong> Ticket <span className="font-mono font-bold text-amber-800">FIN-2026-0142</span> is awaiting Finance Admin resolution on ERP.
            </span>
          </div>
          <button
            onClick={() => {
              if (!isFullPage) setEkaFloatingOpen(false);
              navigate('/admin/finance/requests');
            }}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-800 hover:underline shrink-0 ml-2 flex items-center gap-1 cursor-pointer"
          >
            Finance Queue →
          </button>
        </div>
      )}

      {/* Suggested Questions Chips */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-eka-500" /> Prompts:
        </span>
        {DEFAULT_SUGGESTED_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(chip)}
            className="text-[11px] bg-white hover:bg-eka-50 hover:text-eka-700 hover:border-eka-300 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap transition-all shadow-2xs shrink-0"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'eka' && (
              <div className="w-8 h-8 rounded-xl bg-eka-100 text-eka-700 flex items-center justify-center shrink-0 ring-1 ring-eka-200 mt-1">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] ${m.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-erp-600 text-white rounded-br-xs shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                {/* Continuous Learning Loop Banner */}
                {m.isLearnedFromResolution && (
                  <div className="mt-2.5 p-2.5 bg-emerald-50/90 border border-emerald-300/80 rounded-xl text-left flex items-start gap-2 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-950 leading-normal">
                      <span className="font-bold text-emerald-800">✨ Continuous RAG Learning: </span>
                      This determination was autonomously synthesized into company knowledge from resolved ticket{' '}
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200">{m.resolvedRequestId || 'FIN-2026-0142'}</span>{' '}
                      and synchronized into the vector index. Zero human escalation needed.
                    </div>
                  </div>
                )}

                {/* Sources & Citations if available */}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 text-left">
                    {m.sources.map((s, idx) => (
                      <SourceCitationCard key={idx} citation={s} />
                    ))}
                  </div>
                )}

                {/* Abstention & Escalation state */}
                {m.isAbstention && (
                  <EscalationCard
                    query={m.escalationQuery || ''}
                    department={m.escalationDept || 'Finance'}
                    message="When policy boundaries are ambiguous, EKA refuses to invent determinations and immediately invites human administrator review."
                    existingRequestId={m.associatedRequestId}
                    onEscalated={(newId) => {
                      m.associatedRequestId = newId;
                      // Inject notice
                      setMessages(prev => [
                        ...prev,
                        {
                          id: `notice-${Date.now()}`,
                          sender: 'eka',
                          text: `Review request ${newId} has been created and routed to the Finance Admin queue. You can track this in "My Requests".`,
                          timestamp: 'Just now',
                        },
                      ]);
                    }}
                  />
                )}
              </div>

              <span className="text-[10px] text-slate-400 mt-1 px-1 block font-mono">
                {m.timestamp}
              </span>
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-1">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 items-center text-xs text-slate-500 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-eka-100 text-eka-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-eka-500 animate-ping"></span>
              <span className="text-slate-600 font-medium">Consulting Nexora knowledge base & policies...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Field */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about travel, leave, Project Orion, or company SOPs..."
            className="flex-1 enterprise-input text-xs py-2.5"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="btn-eka-primary px-3 py-2.5 text-xs shrink-0 rounded-lg disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" /> Grounded in verified documentation
          </span>
          <button
            onClick={() => {
              if (!isFullPage) setEkaFloatingOpen(false);
              navigate('/app/eka/requests');
            }}
            className="text-erp-600 hover:underline font-semibold"
          >
            View Escalation History →
          </button>
        </div>
      </div>
    </div>
  );
};
