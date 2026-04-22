import { useState } from "react";
import { X, Sparkles, Rss, BrainCircuit, Search, Loader2 } from "lucide-react";
import { trpc } from "@/trpc/client";

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

  const randomTopicQuery = trpc.contentPlan.getRandomTopic.useQuery(
    { projectId },
    { enabled: false }
  );

  const proposeIdeasMut = trpc.contentPlan.proposeIdeas.useMutation({
    onSuccess: (data) => setProposedIdeas(data.ideas),
  });

  const createItemMut = trpc.contentPlan.createItem.useMutation();

  const [proposedIdeas, setProposedIdeas] = useState<any[]>([]);

  const handleProposeIdeas = () => {
    if (!topic.trim()) return;
    proposeIdeasMut.mutate({ topic });
  };

  const handleSaveToPlan = async () => {
    try {
      await Promise.all(
        proposedIdeas.map((idea, idx) =>
          createItemMut.mutateAsync({
            projectId,
            data: {
              url: "",
              section: topic, // Using the topic as the overarching section/silo name
              pageType: idea.type,
              priority: 1,
              metaTitle: idea.title,
              h1: idea.title,
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
              onClick={async () => {
                const res = await randomTopicQuery.refetch();
                if (res.data?.topic) setTopic(res.data.topic);
                setMode("manual");
              }}
              disabled={randomTopicQuery.isFetching}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
            >
              {randomTopicQuery.isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
              Random from Core
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
                  <label className="block text-sm font-medium text-surface-300 mb-2">Target Topic</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Running shoes for flat feet"
                      className="input-field flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleProposeIdeas()}
                    />
                    <button
                      onClick={handleProposeIdeas}
                      disabled={!topic || proposeIdeasMut.isPending}
                      className="btn-primary gap-2 px-6"
                    >
                      {proposeIdeasMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Propose Ideas
                    </button>
                  </div>
                </div>

                {proposedIdeas.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-surface-100 border-b border-surface-800 pb-2">Proposed Structure</h3>
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
                  />
                  <button className="btn-secondary gap-2" onClick={() => alert("RSS parsing coming soon")}>
                    Analyze Feed
                  </button>
                </div>
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
                      if (e.key === "Enter" && chatInput) {
                        setChatLog([...chatLog, { role: "user", content: chatInput }, { role: "ai", content: "Thinking... (Simulated Response)" }]);
                        setChatInput("");
                      }
                    }}
                  />
                  <button className="btn-primary" onClick={() => {
                    if (chatInput) {
                      setChatLog([...chatLog, { role: "user", content: chatInput }, { role: "ai", content: "Thinking... (Simulated Response)" }]);
                      setChatInput("");
                    }
                  }}>
                    Ask AI
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
