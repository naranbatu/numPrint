"use client";

import { useState, useRef, useEffect } from "react";
import { submitCode } from "@/lib/actions";
import { TEAMS, PROBLEMS, LANGUAGES } from "@/lib/config";
import {
  detectAiExtensions,
  startTabTracking,
  startPasteTracking,
} from "@/lib/ai-detect";

export function SubmitForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<{
    type: "idle" | "loading" | "success" | "error";
    message?: string;
  }>({ type: "idle" });

  // Start tracking on mount
  useEffect(() => {
    startTabTracking();
    startPasteTracking("code");
  }, []);

  async function handleSubmit(formData: FormData) {
    setStatus({ type: "loading" });
    const code = formData.get("code") as string;
    const aiResult = detectAiExtensions(code);
    formData.set("aiDetected", String(aiResult.detected));
    formData.set("aiDetails", JSON.stringify({
      extensions: aiResult.extensions,
      tabSwitches: aiResult.tabSwitches,
      paste: aiResult.paste,
      codeScore: aiResult.codeScore,
      codeReasons: aiResult.codeReasons,
    }));
    const result = await submitCode(formData);
    if (result.success) {
      setStatus({ type: "success", message: "Код амжилттай илгээгдлээ!" });
      formRef.current?.reset();
      setTimeout(() => setStatus({ type: "idle" }), 3000);
    } else {
      setStatus({ type: "error", message: result.error });
    }
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="bg-white shadow-lg rounded-xl p-6 space-y-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="teamName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Баг
          </label>
          <select
            id="teamName"
            name="teamName"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Сонгох...</option>
            {TEAMS.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="problem"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Бодлого
          </label>
          <select
            id="problem"
            name="problem"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Сонгох...</option>
            {PROBLEMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="language"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Хэл
          </label>
          <select
            id="language"
            name="language"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Сонгох...</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="code"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Код
        </label>
        <textarea
          id="code"
          name="code"
          required
          rows={15}
          placeholder="Кодоо энд хуулж тавина уу..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={status.type === "loading"}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {status.type === "loading" ? "Илгээж байна..." : "Илгээх"}
      </button>

      {status.type === "success" && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-center font-medium">
          {status.message}
        </div>
      )}

      {status.type === "error" && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-center">
          {status.message}
        </div>
      )}
    </form>
  );
}
