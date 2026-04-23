import { useState } from "react";
import { X, Sparkles, Rss, BrainCircuit, Search, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/trpc/client";
import { AIModelSelector } from "../ui/AIModelSelector";

export function IdeationModal({
  projectId,
  onClose,
  onAddItems,
}: {
  projectId: string;
  onClose: () => void;
  onAddItems: () => void; // Called when new items are added to plan
}) {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"manual" | "rss" | "chat">("manual");
  const [rssUrl, setRssUrl] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [fleshOutModelId, setFleshOutModelId] = useState("");
  const [selectedIdeas, setSelectedIdeas] = useState<Set<number>>(new Set());

  const titlesQuery = trpc.contentPlan.getProjectTitles.useQuery({ projectId });
  const existingTitles = new Set(titlesQuery.data || []);

  const randomTopicQuery = trpc.contentPlan.getRandomTopic.useQuery(
    { projectId },
    { enabled: false }
  );

  const proposeIdeasMut = trpc.contentPlan.proposeIdeas.useMutation({
    onSuccess: (data) => {
      setProposedIdeas(data.ideas);
      setSelectedIdeas(new Set(data.ideas.map((_: any, i: number) => i))); // select all by default
    },
  });

  const chatMut = trpc.contentPlan.chat.useMutation({
    onSuccess: (data) => {
      setChatLog((prev) => {
        // Remove the "Thinking..." message
        const newLog = prev.filter(m => m.content !== "Thinking... (Simulated Response)");
        return [...newLog, { role: "ai", content: data.message }];
      });
    },
    onError: (err) => {
      setChatLog((prev) => {
        const newLog = prev.filter(m => m.content !== "Thinking... (Simulated Response)");
        return [...newLog, { role: "ai", content: `Error: ${err.message}` }];
      });
    }
  });

  const analyzeRssMut = trpc.contentPlan.analyzeRss.useMutation({
    onSuccess: (data) => setProposedIdeas(data.ideas),
    onError: (err) => alert(err.message),
  });

  const fleshOutMut = trpc.contentPlan.fleshOutIdeas.useMutation({
    onSuccess: (data) => {
      // Merge the fleshed out data back into the proposedIdeas array
      setProposedIdeas(prev => prev.map((idea, i) => {
        if (selectedIdeas.has(i)) {
          // Find corresponding enriched idea
          // We know the returned array maps 1:1 with the selected ideas
          const enrichedIdx = Array.from(selectedIdeas).indexOf(i);
          const enriched = data.enrichedIdeas[enrichedIdx];
          return { ...idea, ...enriched };
        }
        return idea;
      }));
    },
    onError: (err) => alert(err.message),
  });

  const createItemMut = trpc.contentPlan.createItem.useMutation();

  const [proposedIdeas, setProposedIdeas] = useState<any[]>([]);

  const handleProposeIdeas = () => {
    if (!topic.trim()) return;
    proposeIdeasMut.mutate({ topic, projectId, modelId: selectedModelId || undefined });
  };

  const handleSaveToPlan = async () => {
    const ideasToSave = proposedIdeas.filter((_, i) => selectedIdeas.has(i));
    if (ideasToSave.length === 0) return;

    try {
      await Promise.all(
        ideasToSave.map((idea) =>
          createItemMut.mutateAsync({
            projectId,
            data: {
              url: idea.url || "",
              section: topic,
              pageType: idea.type,
              priority: 1,
              metaTitle: idea.title,
              metaDesc: idea.metaDesc,
              h1: idea.h1 || idea.title,
              h2Headings: idea.h2Headings,
              targetKeywords: idea.targetKeywords,
              tags: idea.tags,
            },
          })
        )
      );
      onAddItems();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error saving items to plan.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-surface-50">Content Ideation & Planning</h2>
              <p className="text-xs text-surface-400">Generate structured content plans using AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-surface-500 hover:text-surface-200 bg-surface-800/50 hover:bg-surface-700/50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar Tools */}
          <div className="w-64 border-r border-surface-800 p-4 space-y-2 overflow-y-auto bg-surface-900/50">
            <button
              onClick={() => setMode("manual")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "manual" ? "bg-brand-500/15 text-brand-400 border border-brand-500/30" : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
              }`}
            >
              <Search className="w-4 h-4" /> Topic Analysis
            </button>
            <button
              onClick={() => setMode("rss")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "rss" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
              }`}
            >
              <Rss className="w-4 h-4" /> Competitor RSS
            </button>
            <button
              onClick={() => setMode("chat")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                mode === "chat" ? "bg-purple-500/15 text-purple-400 border border-purple-500/30" : "text-surface-400 hover:bg-surface-800 hover:text-surface-200"
              }`}
            >
              <BrainCircuit className="w-4 h-4" /> Neural Network
            </button>
          </div>

          {/* Main Workspace */}
          <div className="flex-1 p-6 overflow-y-auto bg-surface-950">
            {mode === "manual" && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-surface-300">Target Topic</label>
                    <button
                      onClick={async () => {
                        const res = await randomTopicQuery.refetch();
                        if (res.data?.topic) setTopic(res.data.topic);
                      }}
                      disabled={randomTopicQuery.isFetching}
                      className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                    >
                      {randomTopicQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} 
                      Random from Core
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Running shoes for flat feet"
                      className="input-field flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleProposeIdeas()}
                    />
                    <div className="flex items-center gap-2">
                      <AIModelSelector
                        onModelSelect={setSelectedModelId}
                        selectedModelId={selectedModelId}
                        estimatedPromptTokens={200}
                        expectedOutputTokens={300}
                      />
                      <button
                        onClick={handleProposeIdeas}
                        disabled={!topic || proposeIdeasMut.isPending}
                        className="btn-primary gap-2"
                      >
                        {proposeIdeasMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Propose Ideas
                      </button>
                    </div>
                  </div>
                </div>

                {proposedIdeas.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-surface-100 border-b border-surface-800 pb-2">Content Strategy Ideas</h3>
                    <div className="grid gap-3">
                      {proposedIdeas.map((idea, idx) => {
                        const isSelected = selectedIdeas.has(idx);
                        const isDuplicate = existingTitles.has(idea.title.toLowerCase());
                        
                        return (
                          <div key={idx} className={`p-4 rounded-xl border flex items-start gap-4 transition-colors ${
                            isSelected ? "border-brand-500/50 bg-brand-500/5" : "border-surface-700/50 bg-surface-800/30"
                          }`}>
                            <input 
                              type="checkbox" 
                              className="mt-1"
                              checked={isSelected}
                              onChange={(e) => {
                                const newSet = new Set(selectedIdeas);
                                if (e.target.checked) newSet.add(idx);
                                else newSet.delete(idx);
                                setSelectedIdeas(newSet);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-surface-200 truncate">{idea.title}</p>
                                {isDuplicate && (
                                  <div className="flex items-center gap-1 text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" title="A similar title already exists in your plan">
                                    <AlertCircle className="w-3 h-3" /> Duplicate
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="badge text-[10px]">{idea.type}</span>
                                <p className="text-xs text-surface-500">Intent: {idea.intent}</p>
                              </div>
                              {idea.metaDesc && (
                                <div className="mt-3 p-3 bg-surface-900/50 rounded-lg border border-surface-700/30 text-xs text-surface-300 space-y-2">
                                  <p><strong className="text-surface-100">URL:</strong> /{idea.url}</p>
                                  <p><strong className="text-surface-100">H1:</strong> {idea.h1}</p>
                                  <p><strong className="text-surface-100">Meta:</strong> {idea.metaDesc}</p>
                                  {idea.targetKeywords?.length > 0 && (
                                    <p><strong className="text-surface-100">Keywords:</strong> {idea.targetKeywords.join(', ')}</p>
                                  )}
                                  {idea.tags?.length > 0 && (
                                    <p><strong className="text-surface-100">Tags:</strong> {idea.tags.join(', ')}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-6 space-y-4 border-t border-surface-800 mt-4">
                      {/* AI Action Block */}
                      <div className="p-4 bg-surface-800/30 rounded-xl border border-surface-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-medium text-surface-200 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brand-400" />
                            Deep SEO Generation
                          </h4>
                          <p className="text-xs text-surface-500">
                            Generate URLs, Meta Descriptions, H1s, H2s, and Tags for selected ideas.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <AIModelSelector
                            onModelSelect={setFleshOutModelId}
                            selectedModelId={fleshOutModelId}
                            estimatedPromptTokens={500}
                            expectedOutputTokens={800}
                          />
                          <button 
                            onClick={() => {
                              const ideasToFleshOut = proposedIdeas.filter((_, i) => selectedIdeas.has(i));
                              fleshOutMut.mutate({
                                topic,
                                projectId,
                                ideas: ideasToFleshOut.map(id => ({ title: id.title, type: id.type, intent: id.intent })),
                                modelId: fleshOutModelId || undefined
                              });
                            }}
                            disabled={fleshOutMut.isPending || selectedIdeas.size === 0} 
                            className="btn-secondary gap-2 text-brand-300"
                          >
                            {fleshOutMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                            Generate SEO
                          </button>
                        </div>
                      </div>

                      {/* Save Block */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-surface-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500/50"></span>
                          Saving to plan does not consume AI tokens.
                        </p>
                        <button onClick={handleSaveToPlan} disabled={createItemMut.isPending || selectedIdeas.size === 0 || fleshOutMut.isPending} className="btn-primary gap-2">
                          {createItemMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Add {selectedIdeas.size} items to Plan
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === "rss" && (
              <div className="space-y-6 animate-fade-in">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <h3 className="text-sm font-medium text-amber-400 mb-1 flex items-center gap-2">
                    <Rss className="w-4 h-4" /> RSS Feed Analysis
                  </h3>
                  <p className="text-xs text-amber-400/80">Paste a competitor's RSS feed URL to extract their latest topics and generate counter-strategies.</p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={rssUrl}
                    onChange={(e) => setRssUrl(e.target.value)}
                    placeholder="https://competitor.com/feed.xml"
                    className="input-field flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && rssUrl) {
                        analyzeRssMut.mutate({ url: rssUrl, modelId: selectedModelId || undefined });
                      }
                    }}
                  />
                  <button 
                    className="btn-secondary gap-2" 
                    disabled={!rssUrl || analyzeRssMut.isPending}
                    onClick={() => analyzeRssMut.mutate({ url: rssUrl, modelId: selectedModelId || undefined })}
                  >
                    {analyzeRssMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
                    Analyze Feed
                  </button>
                </div>

                {proposedIdeas.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-surface-100 border-b border-surface-800 pb-2">Proposed Counter-Strategies</h3>
                    <div className="grid gap-3">
                      {proposedIdeas.map((idea, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-surface-700/50 bg-surface-800/30 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-surface-200">{idea.title}</p>
                            <p className="text-xs text-surface-500 mt-1">Intent: {idea.intent}</p>
                          </div>
                          <span className="badge text-xs">{idea.type}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end pt-4">
                      <button onClick={handleSaveToPlan} disabled={createItemMut.isPending} className="btn-primary gap-2">
                        {createItemMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Add {proposedIdeas.length} items to Plan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === "chat" && (
              <div className="space-y-6 flex flex-col h-full animate-fade-in">
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <h3 className="text-sm font-medium text-purple-400 mb-1 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> Neural Network Brainstorming
                  </h3>
                  <p className="text-xs text-purple-400/80">Chat with the SEO AI to brainstorm silos and content architectures.</p>
                </div>
                
                <div className="flex-1 min-h-[200px] border border-surface-800 rounded-xl p-4 bg-surface-900/50 overflow-y-auto space-y-4">
                  {chatLog.length === 0 && (
                    <div className="h-full flex items-center justify-center text-surface-500 text-sm italic">
                      Start typing to interact with the AI...
                    </div>
                  )}
                  {chatLog.map((msg, i) => (
                    <div key={i} className={`p-3 rounded-xl max-w-[80%] ${msg.role === "user" ? "bg-brand-500/20 ml-auto" : "bg-surface-800 mr-auto"}`}>
                      <p className="text-sm text-surface-200">{msg.content}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="e.g. 'Give me 5 article ideas for beginner runners...'"
                    className="input-field flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && chatInput && !chatMut.isPending) {
                        const newMsg = { role: "user" as const, content: chatInput };
                        setChatLog([...chatLog, newMsg, { role: "ai", content: "Thinking... (Simulated Response)" }]);
                        setChatInput("");
                        chatMut.mutate({ messages: [...chatLog, newMsg], modelId: selectedModelId || undefined });
                      }
                    }}
                  />
                  <div className="flex flex-col gap-2">
                    <AIModelSelector
                      onModelSelect={setSelectedModelId}
                      selectedModelId={selectedModelId}
                    />
                    <button className="btn-primary w-full" disabled={chatMut.isPending || !chatInput} onClick={() => {
                      if (chatInput && !chatMut.isPending) {
                        const newMsg = { role: "user" as const, content: chatInput };
                        setChatLog([...chatLog, newMsg, { role: "ai", content: "Thinking... (Simulated Response)" }]);
                        setChatInput("");
                        chatMut.mutate({ messages: [...chatLog, newMsg], modelId: selectedModelId || undefined });
                      }
                    }}>
                      {chatMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask AI"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
