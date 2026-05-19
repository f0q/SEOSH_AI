"use client";

import { useState } from "react";
import { Users, Plus, Minus, History, Coins, RefreshCw, Loader2, Search, UserPlus } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { trpc } from "@/trpc/client";
import { authClient } from "@/lib/auth-client";

export default function UsersSection() {
  const t = useTranslations("admin.users");
  const locale = useLocale();
  const dateLocale = locale === "ru" ? "ru-RU" : "en-US";

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const usersQuery = trpc.admin.listUsers.useQuery();
  const historyQuery = trpc.admin.getUserHistory.useQuery(
    { userId: selectedUserId!, limit: 30 },
    { enabled: !!selectedUserId }
  );

  const adjustMut = trpc.admin.adjustBalance.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      historyQuery.refetch();
      setAmount("");
      setReason("");
    },
  });

  const filteredUsers = (usersQuery.data || []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const selectedUser = usersQuery.data?.find((u) => u.id === selectedUserId);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateUserMsg(null);

    const { error } = await authClient.admin.createUser({
      email: newUserEmail,
      password: newUserPassword,
      name: newUserName,
      role: "user",
    });

    setCreatingUser(false);
    if (error) {
      setCreateUserMsg({ kind: "err", text: t("createErr", { msg: error.message ?? "" }) });
    } else {
      setCreateUserMsg({ kind: "ok", text: t("createOk") });
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserName("");
      usersQuery.refetch();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-surface-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-400" />
            {t("heading", { n: usersQuery.data?.length || 0 })}
          </h2>
          <button onClick={() => usersQuery.refetch()} className="text-surface-500 hover:text-surface-300">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50"
          />
        </div>

        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUserId(user.id)}
              className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${
                selectedUserId === user.id
                  ? "bg-brand-500/10 border border-brand-500/30"
                  : "hover:bg-surface-800/40 border border-transparent"
              }`}
            >
              <div>
                <p className="text-sm font-medium text-surface-100">{user.name}</p>
                <p className="text-xs text-surface-500">{user.email}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className={`text-sm font-mono font-medium ${
                  user.tokens > 50 ? "text-emerald-400" : user.tokens > 0 ? "text-amber-400" : "text-red-400"
                }`}>
                  {user.tokens}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-5 border-brand-500/30">
          <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-brand-400" />
            {t("createTitle")}
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-3">
            <input type="text" required value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder={t("fullName")}
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50" />
            <input type="email" required value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder={t("email")}
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50" />
            <input type="text" required value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} placeholder={t("password")}
              className="w-full px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50" />
            <button type="submit" disabled={creatingUser}
              className="w-full py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : t("createBtn")}
            </button>
            {createUserMsg && (
              <p className={`text-xs mt-2 ${createUserMsg.kind === "err" ? "text-red-400" : "text-emerald-400"}`}>{createUserMsg.text}</p>
            )}
          </form>
        </div>

        {selectedUser ? (
          <>
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-surface-400">{t("balanceFor")}</p>
                  <p className="text-lg font-semibold text-surface-100">{selectedUser.name}</p>
                  <p className="text-xs text-surface-500">{selectedUser.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-surface-50">{selectedUser.tokens}</p>
                  <p className="text-xs text-surface-400">{t("tokens")}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("amount")}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50 font-mono" />
                <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reason")}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-surface-900/50 border border-surface-700 text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500/50" />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => amount && adjustMut.mutate({ userId: selectedUser.id, amount: +Math.abs(Number(amount)), reason: reason || undefined })}
                  disabled={!amount || adjustMut.isPending}
                  className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
                  {adjustMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {t("topUp")}
                </button>
                <button onClick={() => amount && adjustMut.mutate({ userId: selectedUser.id, amount: -Math.abs(Number(amount)), reason: reason || undefined })}
                  disabled={!amount || adjustMut.isPending}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
                  {adjustMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Minus className="w-3.5 h-3.5" />}
                  {t("deduct")}
                </button>
              </div>
            </div>

            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-surface-400" />
                {t("historyTitle")}
              </h3>
              <div className="space-y-1 max-h-[350px] overflow-y-auto">
                {historyQuery.data?.length === 0 && (
                  <p className="text-xs text-surface-500 text-center py-4">{t("historyEmpty")}</p>
                )}
                {historyQuery.data?.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-surface-800/30 text-xs">
                    <div>
                      <p className="text-surface-200 font-medium">{tx.reason.replace(/_/g, " ")}</p>
                      <p className="text-surface-500">{tx.details || "—"}</p>
                      <p className="text-surface-600 text-[10px]">{new Date(tx.createdAt).toLocaleString(dateLocale)}</p>
                    </div>
                    <span className={`font-mono font-medium ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card p-12 text-center">
            <Users className="w-10 h-10 text-surface-600 mx-auto mb-3" />
            <p className="text-surface-400">{t("selectHint")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
