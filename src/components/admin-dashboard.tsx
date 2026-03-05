"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getSubmissions,
  togglePrinted,
  deleteSubmission,
  type Submission,
} from "@/lib/actions";

const EXPIRY_MS = 5 * 60 * 1000;

function RemainingTime({ createdAt, now }: { createdAt: string; now: number }) {
  const elapsed = now - new Date(createdAt).getTime();
  const remaining = Math.max(0, EXPIRY_MS - elapsed);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  if (remaining === 0) {
    return <span className="text-red-500 text-xs font-medium">Хугацаа дууссан</span>;
  }

  const isLow = remaining < 60_000;
  return (
    <span className={`text-xs font-mono font-medium ${isLow ? "text-red-500" : "text-gray-600"}`}>
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

function parseAiDetails(details: string | null) {
  if (!details) return null;
  try {
    return JSON.parse(details) as {
      extensions?: string[];
      tabSwitches?: { switchCount: number; totalAwayMs: number };
      paste?: { pasteCount: number; totalPastedChars: number };
      codeScore?: number;
      codeReasons?: string[];
    };
  } catch {
    return null;
  }
}

function AiDetailsPanel({ details }: { details: string | null }) {
  const info = parseAiDetails(details);
  if (!info) return <p className="text-xs text-red-600 mt-1">AI илэрсэн</p>;

  return (
    <div className="mt-2 bg-red-50 rounded-lg p-2 text-xs space-y-1">
      <p className="font-medium text-red-700">AI илэрсэн:</p>
      {info.extensions && info.extensions.length > 0 && (
        <p className="text-red-600">
          Extension: {info.extensions.join(", ")}
        </p>
      )}
      {info.tabSwitches && info.tabSwitches.switchCount > 0 && (
        <p className="text-red-600">
          Tab солисон: {info.tabSwitches.switchCount} удаа ({Math.round(info.tabSwitches.totalAwayMs / 1000)}с нийт)
        </p>
      )}
      {info.paste && info.paste.pasteCount > 0 && (
        <p className="text-red-600">
          Paste: {info.paste.pasteCount} удаа ({info.paste.totalPastedChars} тэмдэгт)
        </p>
      )}
      {info.codeScore !== undefined && info.codeScore > 0 && (
        <p className="text-red-600">
          Код AI оноо: {info.codeScore}% {info.codeReasons?.length ? `(${info.codeReasons.join(", ")})` : ""}
        </p>
      )}
    </div>
  );
}

function AiBadge({ submission }: { submission: Submission }) {
  if (!submission.aiDetected) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Цэвэр
      </span>
    );
  }

  const info = parseAiDetails(submission.aiDetails);
  const parts: string[] = [];
  if (info?.extensions?.length) parts.push(`Ext: ${info.extensions.length}`);
  if (info?.tabSwitches?.switchCount) parts.push(`Tab: ${info.tabSwitches.switchCount}x`);
  if (info?.paste?.pasteCount) parts.push(`Paste: ${info.paste.pasteCount}x`);
  if (info?.codeScore && info.codeScore >= 30) parts.push(`Код: ${info.codeScore}%`);

  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 cursor-help"
      title={parts.join(" | ")}
    >
      Илэрсэн
    </span>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printCode(submission: Submission) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const lines = submission.code.split("\n");
  const numberedLines = lines
    .map((line, i) => {
      const num = String(i + 1).padStart(4, " ");
      return `<span style="color:#888;user-select:none">${num}</span>  ${escapeHtml(line)}`;
    })
    .join("\n");

  const teamName = escapeHtml(submission.teamName);
  const problem = escapeHtml(submission.problem);
  const language = escapeHtml(submission.language);
  const date = new Date(submission.createdAt).toLocaleString("mn-MN");

  printWindow.document.write(`<!DOCTYPE html>
<html><head>
  <title>${teamName} - ${problem} (${language})</title>
  <style>
    body { margin: 20px; font-family: monospace; font-size: 12px; }
    .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
    .header h2 { margin: 0 0 4px 0; font-size: 16px; }
    .meta { color: #555; font-size: 12px; }
    pre { line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <div class="header">
    <h2>${teamName} - Бодлого ${problem}</h2>
    <div class="meta">Хэл: ${language} | Огноо: ${date}</div>
  </div>
  <pre>${numberedLines}</pre>
  <script>window.onload=function(){window.print()}<\/script>
</body></html>`);
  printWindow.document.close();
}

export function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCode, setSelectedCode] = useState<Submission | null>(null);
  const [filterTeam, setFilterTeam] = useState("");
  const [filterProblem, setFilterProblem] = useState("");

  const fetchSubmissions = useCallback(async (pwd: string) => {
    setLoading(true);
    const result = await getSubmissions(pwd);
    if (result.success && result.submissions) {
      setSubmissions(result.submissions);
      setAuthenticated(true);
      setError("");
    } else {
      setError(result.error || "Алдаа гарлаа");
    }
    setLoading(false);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    await fetchSubmissions(password);
  }

  async function handleTogglePrinted(id: string) {
    const result = await togglePrinted(password, id);
    if (result.success) {
      await fetchSubmissions(password);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Устгах уу?")) return;
    const result = await deleteSubmission(password, id);
    if (result.success) {
      await fetchSubmissions(password);
      if (selectedCode?.id === id) setSelectedCode(null);
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => fetchSubmissions(password), 30_000);
    return () => clearInterval(interval);
  }, [authenticated, password, fetchSubmissions]);

  // Update remaining time every second
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  if (!authenticated) {
    return (
      <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-20">
        <label
          htmlFor="admin-password"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Админ нууц үг
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500"
          placeholder="Нууц үг..."
        />
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Нэвтэрж байна..." : "Нэвтрэх"}
        </button>
      </form>
    );
  }

  const filtered = submissions.filter((s) => {
    if (filterTeam && s.teamName !== filterTeam) return false;
    if (filterProblem && s.problem !== filterProblem) return false;
    return true;
  });

  const uniqueTeams = [...new Set(submissions.map((s) => s.teamName))].sort();
  const uniqueProblems = [
    ...new Set(submissions.map((s) => s.problem)),
  ].sort();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Бүх баг</option>
          {uniqueTeams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterProblem}
          onChange={(e) => setFilterProblem(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">Бүх бодлого</option>
          {uniqueProblems.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>

        <button
          onClick={() => fetchSubmissions(password)}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
        >
          Шинэчлэх
        </button>

        <span className="text-sm text-gray-500">Нийт: {filtered.length}</span>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                #
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Баг
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Бодлого
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Хэл
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Үлдсэн
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                AI
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Төлөв
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">
                Үйлдэл
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{s.teamName}</td>
                <td className="px-4 py-3">{s.problem}</td>
                <td className="px-4 py-3">{s.language}</td>
                <td className="px-4 py-3">
                  <RemainingTime createdAt={s.createdAt} now={now} />
                </td>
                <td className="px-4 py-3">
                  <AiBadge submission={s} />
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.printed
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {s.printed ? "Хэвлэсэн" : "Хүлээгдэж буй"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCode(s)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Харах
                    </button>
                    <button
                      onClick={() => {
                        printCode(s);
                        handleTogglePrinted(s.id);
                      }}
                      className="text-green-600 hover:text-green-800 text-xs font-medium"
                    >
                      Хэвлэх
                    </button>
                    <button
                      onClick={() => handleTogglePrinted(s.id)}
                      className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                    >
                      {s.printed ? "Буцаах" : "Тэмдэглэх"}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Устгах
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Илгээлт байхгүй байна
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="font-bold text-lg">
                  {selectedCode.teamName} - Бодлого {selectedCode.problem}
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedCode.language} |{" "}
                  {new Date(selectedCode.createdAt).toLocaleString("mn-MN")}
                </p>
                {selectedCode.aiDetected && (
                  <AiDetailsPanel details={selectedCode.aiDetails} />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    printCode(selectedCode);
                    handleTogglePrinted(selectedCode.id);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                >
                  Хэвлэх
                </button>
                <button
                  onClick={() => setSelectedCode(null)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  Хаах
                </button>
              </div>
            </div>
            <div className="overflow-auto p-6">
              <pre className="text-sm font-mono bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto whitespace-pre">
                {selectedCode.code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
