import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  User,
  UserRole,
  KnowledgeDocument,
  EkaRequest,
  KnowledgeGap,
  SyncRecord,
  RagLearnedChunk,
} from '../mock/mockData';
import {
  SEED_USERS,
  SEED_DOCUMENTS,
  INITIAL_ESCALATIONS,
  INITIAL_KNOWLEDGE_GAPS,
  INITIAL_SYNC_HISTORY,
  INITIAL_RAG_CHUNKS,
} from '../mock/mockData';
import apiService, { type HealthStatus } from '../services/api';
import { ToastContainer, type ToastMessage } from '../components/common/ToastContainer';

interface BackendHealthState {
  online: boolean;
  latencyMs?: number;
  isChecking: boolean;
}

interface AppContextType {
  currentUser: User;
  switchUser: (role: UserRole) => void;
  documents: KnowledgeDocument[];
  requests: EkaRequest[];
  ragLearnedChunks: RagLearnedChunk[];
  knowledgeGaps: KnowledgeGap[];
  syncHistory: SyncRecord[];
  syncStatus: {
    lastSync: string;
    nextSync: string;
    freshness: number;
    isSyncing: boolean;
    syncProgress: number;
  };
  addRequest: (newReq: Partial<EkaRequest>) => string;
  resolveRequest: (id: string, response: string, proposeAsKnowledge: boolean) => void;
  fastForwardSync: (chunkId?: string) => void;
  resetSimulation: () => void;
  runFullSync: (onComplete?: () => void) => void;
  ekaFloatingOpen: boolean;
  setEkaFloatingOpen: (open: boolean) => void;
  activeEkaQuery: string;
  setActiveEkaQuery: (query: string) => void;
  backendHealth: BackendHealthState;
  addToast: (toastOrTitle: Omit<ToastMessage, 'id'> | string, type?: ToastMessage['type']) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toastOrTitle: Omit<ToastMessage, 'id'> | string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    let newToast: ToastMessage;
    if (typeof toastOrTitle === 'string') {
      newToast = { id, title: toastOrTitle, type };
    } else {
      newToast = { ...toastOrTitle, id };
    }
    setToasts(prev => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };


  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // 2. Backend Health State & Auto-Login
  const [backendHealth, setBackendHealth] = useState<BackendHealthState>({
    online: false,
    isChecking: true,
  });

  useEffect(() => {
    let isMounted = true;

    const checkLiveBackend = async () => {
      try {
        const res = await apiService.checkHealth();
        if (!isMounted) return;
        setBackendHealth({
          online: res.online,
          latencyMs: res.latencyMs,
          isChecking: false,
        });

        if (res.online) {
          // Attempt silent superadmin authentication with live backend
          await apiService.login('admin@company.com', 'changeme123', 'default');
        }
      } catch {
        if (isMounted) {
          setBackendHealth({ online: false, isChecking: false });
        }
      }
    };

    checkLiveBackend();
    const interval = setInterval(checkLiveBackend, 30000); // Check every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 3. Current Persona State
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedRole = localStorage.getItem('nexora_role') as UserRole;
    if (savedRole && SEED_USERS[savedRole]) {
      return SEED_USERS[savedRole];
    }
    return SEED_USERS.employee;
  });

  const switchUser = (role: UserRole) => {
    if (SEED_USERS[role]) {
      const user = SEED_USERS[role];
      setCurrentUser(user);
      localStorage.setItem('nexora_role', role);

      addToast({
        type: 'purple',
        title: `Switched Persona: ${user.name}`,
        message: `${user.roleTitle} • ${user.department}`,
      });
    }
  };

  // 4. Documents State (with localStorage persistence)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>(() => {
    try {
      const saved = localStorage.getItem('nexora_docs_v3');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return SEED_DOCUMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexora_docs_v3', JSON.stringify(documents));
    } catch {
      // ignore
    }
  }, [documents]);

  // 5. Requests / Escalations State (with localStorage persistence)
  const [requests, setRequests] = useState<EkaRequest[]>(() => {
    try {
      const saved = localStorage.getItem('nexora_reqs_v3');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_ESCALATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexora_reqs_v3', JSON.stringify(requests));
    } catch {
      // ignore
    }
  }, [requests]);

  // 6. RAG Model Continuous Learning Chunks State (with localStorage persistence)
  const [ragLearnedChunks, setRagLearnedChunks] = useState<RagLearnedChunk[]>(() => {
    try {
      const saved = localStorage.getItem('nexora_chunks_v3');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_RAG_CHUNKS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('nexora_chunks_v3', JSON.stringify(ragLearnedChunks));
    } catch {
      // ignore
    }
  }, [ragLearnedChunks]);

  // 7. Continuous Learning Simulation Ingestion Timer (Simulates vector embedding & indexing countdown)
  useEffect(() => {
    const hasIngesting = ragLearnedChunks.some(c => c.status === 'ingesting');
    if (!hasIngesting) return;

    const interval = setInterval(() => {
      setRagLearnedChunks(prevChunks => {
        let didCompleteSync = false;
        const updated = prevChunks.map(c => {
          if (c.status === 'ingesting') {
            if (c.countdownSeconds <= 1) {
              didCompleteSync = true;
              return {
                ...c,
                status: 'synced' as const,
                countdownSeconds: 0,
                syncedAt: 'Just now',
              };
            }
            return {
              ...c,
              countdownSeconds: c.countdownSeconds - 1,
            };
          }
          return c;
        });

        if (didCompleteSync) {
          // Autonomous update to policy document v3.3
          setDocuments(prevDocs =>
            prevDocs.map(doc => {
              if (doc.id === 'doc-travel-32') {
                return {
                  ...doc,
                  version: 'v3.3',
                  lastUpdated: 'Just now (Synchronized)',
                  summary: 'Comprehensive per-diem allowances, hotel lodging ceilings, international flight tiers, and approved client exception limits up to $280/night.',
                  content: `${doc.content}\n\n### 4. Client On-Site Exception Clause (Added v3.3 - Resolution from FIN-2026-0142)\nHotel accommodation up to **$280/night** is approved for designated client on-site visits where preferred corporate hotels exceed standard limits, provided prior VP email authorization is attached to the NexoraERP expense voucher.`,
                  versionHistory: [
                    {
                      version: 'v3.3',
                      date: 'Today',
                      author: 'Priya Sharma (Finance Lead)',
                      changes: 'Resolution from FIN-2026-0142: Added client exception limit provisions up to $280/night.',
                      status: 'current',
                    },
                    ...doc.versionHistory.map(v => ({ ...v, status: 'previous' as const })),
                  ],
                };
              }
              return doc;
            })
          );

          addToast({
            type: 'success',
            title: '✨ RAG Vector Index Synced',
            message: 'Knowledge Base incorporated ticket FIN-2026-0142 into active vector space (Travel Policy v3.3 active). EKA can now answer without human escalation!',
          });
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [ragLearnedChunks]);

  // Fast-forward RAG vector index sync immediately
  const fastForwardSync = (chunkId?: string) => {
    setRagLearnedChunks(prev =>
      prev.map(c => {
        if (!chunkId || c.id === chunkId || c.requestId === chunkId) {
          return {
            ...c,
            status: 'synced' as const,
            countdownSeconds: 0,
            syncedAt: 'Just now',
          };
        }
        return c;
      })
    );

    setDocuments(prevDocs =>
      prevDocs.map(doc => {
        if (doc.id === 'doc-travel-32') {
          return {
            ...doc,
            version: 'v3.3',
            lastUpdated: 'Just now (Synchronized)',
            summary: 'Comprehensive per-diem allowances, hotel lodging ceilings, international flight tiers, and approved client exception limits up to $280/night.',
            content: `${doc.content}\n\n### 4. Client On-Site Exception Clause (Added v3.3 - Resolution from FIN-2026-0142)\nHotel accommodation up to **$280/night** is approved for designated client on-site visits where preferred corporate hotels exceed standard limits, provided prior VP email authorization is attached to the NexoraERP expense voucher.`,
            versionHistory: [
              {
                version: 'v3.3',
                date: 'Today',
                author: 'Priya Sharma (Finance Lead)',
                changes: 'Resolution from FIN-2026-0142: Added client exception limit provisions up to $280/night.',
                status: 'current',
              },
              ...doc.versionHistory.map(v => ({ ...v, status: 'previous' as const })),
            ],
          };
        }
        return doc;
      })
    );

    addToast({
      type: 'success',
      title: '✨ RAG Vector Index Synced',
      message: 'Fast-forward sync complete! Policy v3.3 active in ChromaDB vector space.',
    });
  };

  // Reset entire simulation to initial baseline
  const resetSimulation = () => {
    try {
      localStorage.removeItem('nexora_docs_v3');
      localStorage.removeItem('nexora_reqs_v3');
      localStorage.removeItem('nexora_chunks_v3');
    } catch {
      // ignore
    }
    setRequests(INITIAL_ESCALATIONS);
    setDocuments(SEED_DOCUMENTS);
    setRagLearnedChunks(INITIAL_RAG_CHUNKS);
    addToast({
      type: 'purple',
      title: '↺ Simulation Reset',
      message: 'RAG model and escalation tickets reset to baseline (FIN-2026-0142 is Pending Review).',
    });
  };

  const addRequest = (newReq: Partial<EkaRequest>): string => {
    const generatedId = newReq.department === 'Finance' 
      ? `FIN-2026-0142` 
      : `${newReq.department?.toUpperCase() || 'REQ'}-2026-0${Math.floor(100 + Math.random() * 900)}`;

    const req: EkaRequest = {
      id: generatedId,
      query: newReq.query || 'Unsupported company policy inquiry',
      requestedBy: currentUser.name,
      requesterEmail: currentUser.email,
      department: newReq.department || 'Finance',
      project: newReq.project,
      priority: newReq.priority || 'Normal',
      status: 'Pending Review',
      createdAt: 'Just now',
      assignedAdmin: newReq.department === 'Finance' ? 'Priya Sharma' : newReq.department === 'HR' ? 'Kavya Iyer' : 'Rohan Kapoor',
      timeline: [
        {
          stage: 'Submitted',
          timestamp: 'Just now',
          actor: currentUser.name,
          notes: 'Automatic escalation created from EKA Insufficient-Evidence response.',
        },
        {
          stage: 'Assigned',
          timestamp: 'Just now',
          actor: newReq.department === 'Finance' ? 'Priya Sharma' : 'Kavya Iyer',
          notes: 'Assigned to departmental lead queue.',
        }
      ],
    };

    setRequests(prev => [req, ...prev.filter(r => r.id !== generatedId)]);

    // Also register in RAG learning queue as pending admin review
    setRagLearnedChunks(prev => {
      const exists = prev.find(c => c.requestId === generatedId);
      if (exists) return prev;
      const newChunk: RagLearnedChunk = {
        id: `rag-chunk-${generatedId}`,
        requestId: generatedId,
        query: req.query,
        department: req.department,
        policyDocId: 'doc-travel-32',
        policyDocTitle: 'Travel & Reimbursement Policy',
        version: 'v3.3',
        responseSnippet: '',
        status: 'pending_admin',
        countdownSeconds: 6,
        createdAt: 'Just now',
      };
      return [newChunk, ...prev];
    });

    addToast({
      type: 'warning',
      title: `Escalation Created: ${generatedId}`,
      message: `Assigned to ${req.assignedAdmin} (${req.department} Lead).`,
    });

    return generatedId;
  };

  const resolveRequest = (id: string, response: string, proposeAsKnowledge: boolean) => {
    setRequests(prev =>
      prev.map(r => {
        if (r.id === id) {
          return {
            ...r,
            status: 'Resolved',
            response,
            proposedAsKnowledge: proposeAsKnowledge,
            timeline: [
              ...(r.timeline || []),
              {
                stage: 'Resolved',
                timestamp: 'Just now',
                actor: currentUser.name,
                notes: proposeAsKnowledge 
                  ? 'Request resolved and proposed to RAG continuous learning pipeline.' 
                  : 'Request resolved and communicated to employee.',
              },
            ],
          };
        }
        return r;
      })
    );

    if (proposeAsKnowledge) {
      // Trigger continuous learning ingestion timer (6s countdown)
      setRagLearnedChunks(prev => {
        const exists = prev.find(c => c.requestId === id);
        if (exists) {
          return prev.map(c =>
            c.requestId === id
              ? {
                  ...c,
                  status: 'ingesting' as const,
                  countdownSeconds: 6,
                  responseSnippet: response,
                }
              : c
          );
        } else {
          const newChunk: RagLearnedChunk = {
            id: `rag-chunk-${id}`,
            requestId: id,
            query: 'Can I claim accommodation above the normal limit for a client visit next month?',
            department: 'Finance',
            policyDocId: 'doc-travel-32',
            policyDocTitle: 'Travel & Reimbursement Policy',
            version: 'v3.3',
            responseSnippet: response,
            status: 'ingesting',
            countdownSeconds: 6,
            createdAt: 'Just now',
          };
          return [newChunk, ...prev];
        }
      });

      addToast({
        type: 'purple',
        title: `⚡ RAG Pipeline Triggered for ${id}`,
        message: 'Resolution submitted to RAG vector indexing pipeline (6s countdown started).',
      });
    } else {
      addToast({
        type: 'success',
        title: `Ticket ${id} Resolved`,
        message: 'Official determination communicated to employee.',
      });
    }
  };

  // 6. Knowledge Gaps
  const [knowledgeGaps] = useState<KnowledgeGap[]>(INITIAL_KNOWLEDGE_GAPS);

  // 7. 14-Day Sync Monitor State
  const [syncHistory, setSyncHistory] = useState<SyncRecord[]>(INITIAL_SYNC_HISTORY);
  const [syncStatus, setSyncStatus] = useState({
    lastSync: 'Sep 01, 2026, 02:00 AM',
    nextSync: 'Sep 15, 2026, 02:00 AM',
    freshness: 92,
    isSyncing: false,
    syncProgress: 0,
  });

  const runFullSync = (onComplete?: () => void) => {
    if (syncStatus.isSyncing) return;
    setSyncStatus(s => ({ ...s, isSyncing: true, syncProgress: 15 }));

    addToast({
      type: 'purple',
      title: '14-Day Reconciliation Started',
      message: 'Scanning PostgreSQL ledgers and ChromaDB namespaces...',
    });

    const timer1 = setTimeout(() => {
      setSyncStatus(s => ({ ...s, syncProgress: 45 }));
    }, 600);

    const timer2 = setTimeout(() => {
      setSyncStatus(s => ({ ...s, syncProgress: 80 }));
    }, 1400);

    const timer3 = setTimeout(() => {
      setSyncStatus(s => ({
        ...s,
        isSyncing: false,
        syncProgress: 100,
        freshness: 100,
        lastSync: 'Just now',
        nextSync: 'Sep 20, 2026, 02:00 AM',
      }));

      const newSyncRecord: SyncRecord = {
        id: `sync-${Math.floor(109 + Math.random() * 50)}`,
        timestamp: 'Just now',
        scope: 'Full Sync',
        changedCount: 18,
        addedCount: 4,
        removedCount: 0,
        status: 'Synchronized',
        duration: '1m 24s',
        details: [
          'Full ERP ledger cross-reconciled with PostgreSQL',
          'ChromaDB vector store updated across 1,284 documents',
          'Recent knowledge proposal from FIN-2026-0142 reconciled',
        ],
      };

      setSyncHistory(prev => [newSyncRecord, ...prev]);

      addToast({
        type: 'success',
        title: '14-Day Reconciliation Complete',
        message: 'PostgreSQL business ledgers & ChromaDB zero drift (Freshness 100%).',
      });

      if (onComplete) onComplete();
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  // 8. Floating Assistant & Query Pre-fill
  const [ekaFloatingOpen, setEkaFloatingOpen] = useState(false);
  const [activeEkaQuery, setActiveEkaQuery] = useState('');

  return (
    <AppContext.Provider
      value={{
        currentUser,
        switchUser,
        documents,
        requests,
        ragLearnedChunks,
        knowledgeGaps,
        syncHistory,
        syncStatus,
        addRequest,
        resolveRequest,
        fastForwardSync,
        resetSimulation,
        runFullSync,
        ekaFloatingOpen,
        setEkaFloatingOpen,
        activeEkaQuery,
        setActiveEkaQuery,
        backendHealth,
        addToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
