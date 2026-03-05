// ── Browser extension detection (DOM + globals only, no network) ──

const AI_EXTENSION_SELECTORS = [
  "[data-chatgpt]", "#chatgpt-wrapper", ".chatgpt-sidebar", "[class*='chatgpt']",
  "#monica-content-root", "[data-monica]", "[class*='monica']",
  "#merlin-root", "[data-merlin]", "[class*='merlin']",
  "#maxai-root", "[data-maxai]", "[class*='maxai']", "[class*='MaxAI']",
  "#sider-root", "[class*='sider']",
  "[data-codeium]", "[class*='codeium']",
  "[class*='phind']", "[class*='perplexity']",
  "[class*='copilot']", "[data-copilot]",
  "[class*='ai-assistant']", "[class*='ai-helper']", "[class*='gpt']",
  "[id*='chatgpt']", "[id*='ai-assist']",
];

const AI_GLOBALS = [
  "__MONICA__", "__MERLIN__", "__MAXAI__", "__CODEIUM__",
  "__CHATGPT__", "_chatgpt", "monicaExtension", "merlinExtension",
];

function checkDomElements(): string[] {
  const found: string[] = [];
  for (const selector of AI_EXTENSION_SELECTORS) {
    try {
      if (document.querySelector(selector)) found.push(selector);
    } catch { /* skip */ }
  }
  return found;
}

function checkGlobalVariables(): string[] {
  const found: string[] = [];
  for (const name of AI_GLOBALS) {
    if (name in window) found.push(`window.${name}`);
  }
  return found;
}

// ── Referrer & storage checks ──

const AI_SITES = [
  "chat.openai.com", "chatgpt.com",
  "claude.ai", "anthropic.com",
  "gemini.google.com", "bard.google.com",
  "copilot.microsoft.com", "copilot.github.com",
  "perplexity.ai", "phind.com", "codeium.com",
  "you.com", "poe.com",
  "deepseek.com", "chat.deepseek.com",
  "huggingface.co/chat", "cursor.com",
];

function checkReferrer(): string | null {
  try {
    const ref = document.referrer.toLowerCase();
    for (const site of AI_SITES) {
      if (ref.includes(site)) return site;
    }
  } catch { /* skip */ }
  return null;
}

function checkStorageTraces(): string[] {
  const found: string[] = [];
  try {
    const storageKeys = [
      ...Object.keys(localStorage),
      ...Object.keys(sessionStorage),
    ];
    const aiPatterns = [
      "chatgpt", "openai", "claude", "gemini", "copilot",
      "codeium", "perplexity", "phind", "deepseek", "poe",
    ];
    for (const key of storageKeys) {
      const keyLower = key.toLowerCase();
      for (const pattern of aiPatterns) {
        if (keyLower.includes(pattern)) {
          found.push(key);
          break;
        }
      }
    }
  } catch { /* blocked */ }
  return found;
}

// ── Tab switch tracking ──

type TabSwitchData = {
  switchCount: number;
  totalAwayMs: number;
  switches: { left: number; returned: number }[];
};

const tabData: TabSwitchData = {
  switchCount: 0,
  totalAwayMs: 0,
  switches: [],
};

let lastHidden = 0;
let tabTrackingStarted = false;

export function startTabTracking() {
  if (tabTrackingStarted) return;
  tabTrackingStarted = true;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      lastHidden = Date.now();
    } else if (lastHidden > 0) {
      const awayMs = Date.now() - lastHidden;
      tabData.switchCount++;
      tabData.totalAwayMs += awayMs;
      tabData.switches.push({ left: lastHidden, returned: Date.now() });
      lastHidden = 0;
    }
  });
}

function getTabSwitchData(): TabSwitchData {
  return { ...tabData, switches: [...tabData.switches] };
}

// ── Paste detection ──

type PasteData = {
  pasteCount: number;
  totalPastedChars: number;
  pastes: { time: number; length: number }[];
};

const pasteData: PasteData = {
  pasteCount: 0,
  totalPastedChars: 0,
  pastes: [],
};

let pasteTrackingStarted = false;

function handlePaste(e: Event) {
  const clipData = (e as ClipboardEvent).clipboardData;
  const text = clipData?.getData("text") || "";
  pasteData.pasteCount++;
  pasteData.totalPastedChars += text.length;
  pasteData.pastes.push({ time: Date.now(), length: text.length });
}

export function startPasteTracking(textareaId: string) {
  if (pasteTrackingStarted) return;
  pasteTrackingStarted = true;

  // Attach to existing element or wait for it
  const attach = () => {
    const el = document.getElementById(textareaId);
    if (el) {
      el.addEventListener("paste", handlePaste);
      return true;
    }
    return false;
  };

  if (!attach()) {
    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

function getPasteData(): PasteData {
  return { ...pasteData, pastes: [...pasteData.pastes] };
}

// ── Code AI pattern analysis ──

const AI_COMMENT_PATTERNS = [
  /\/\/\s*(this|the)\s+(function|method|code|program|solution|algorithm)\s/i,
  /\/\/\s*(here|below)\s+(we|is|are)\s/i,
  /\/\/\s*initialize\s/i,
  /\/\/\s*main\s+logic/i,
  /\/\/\s*helper\s+function/i,
  /\/\/\s*edge\s+case/i,
  /\/\/\s*base\s+case/i,
  /\/\/\s*time\s+complexity/i,
  /\/\/\s*space\s+complexity/i,
  /\/\*\*[\s\S]*?@(param|returns|description)/,
  /\/\/\s*step\s+\d/i,
  /\/\/\s*explanation/i,
  /\/\/\s*note:\s/i,
  /#\s*(this|the)\s+(function|method|code|program|solution)\s/i,
  /#\s*(here|below)\s+(we|is|are)\s/i,
  /#\s*initialize\s/i,
  /#\s*step\s+\d/i,
];

const AI_CODE_PATTERNS = [
  /\/\/\s*.*\n\s*\/\/\s*.*\n\s*\/\/\s*.*/,
  /\bdef\s+solve\b/i,
  /\bdef\s+main\b.*\bsolve\b/i,
  /\bint\s+main\s*\(\s*\)\s*\{[\s\S]*?\/\//,
  /using\s+namespace\s+std;\s*\n\s*\n\s*\/\//,
  /import\s+sys\s*\n.*input/,
];

export function analyzeCodeForAi(code: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  for (const pattern of AI_COMMENT_PATTERNS) {
    if (pattern.test(code)) {
      score += 15;
      reasons.push(`comment:${pattern.source.slice(0, 30)}`);
    }
  }

  for (const pattern of AI_CODE_PATTERNS) {
    if (pattern.test(code)) {
      score += 10;
      reasons.push("code_pattern");
    }
  }

  const lines = code.split("\n");
  const commentLines = lines.filter((l) => {
    const trimmed = l.trim();
    return trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*");
  }).length;
  const ratio = lines.length > 0 ? commentLines / lines.length : 0;
  if (ratio > 0.3) {
    score += 20;
    reasons.push(`high_comment_ratio:${(ratio * 100).toFixed(0)}%`);
  }

  const codeLengths = lines.filter((l) => l.trim().length > 0).map((l) => l.length);
  if (codeLengths.length > 10) {
    const avg = codeLengths.reduce((a, b) => a + b, 0) / codeLengths.length;
    const variance = codeLengths.reduce((sum, l) => sum + (l - avg) ** 2, 0) / codeLengths.length;
    const stddev = Math.sqrt(variance);
    if (stddev < 8 && avg > 20) {
      score += 15;
      reasons.push("uniform_line_lengths");
    }
  }

  return { score: Math.min(score, 100), reasons };
}

// ── Main detection ──

export type DetectResult = {
  detected: boolean;
  extensions: string[];
  tabSwitches: TabSwitchData;
  paste: PasteData;
  codeScore: number;
  codeReasons: string[];
};

export function detectAiExtensions(code?: string): DetectResult {
  const domHits = checkDomElements();
  const globalHits = checkGlobalVariables();
  const referrer = checkReferrer();
  const storageHits = checkStorageTraces();

  const extensions = [
    ...domHits.map((s) => `dom:${s}`),
    ...globalHits.map((s) => `global:${s}`),
    ...storageHits.map((s) => `storage:${s}`),
    ...(referrer ? [`referrer:${referrer}`] : []),
  ];

  const tabs = getTabSwitchData();
  const paste = getPasteData();
  const codeAnalysis = code ? analyzeCodeForAi(code) : { score: 0, reasons: [] };

  const detected =
    extensions.length > 0 ||
    tabs.switchCount >= 2 ||
    codeAnalysis.score >= 30;

  return {
    detected,
    extensions,
    tabSwitches: tabs,
    paste,
    codeScore: codeAnalysis.score,
    codeReasons: codeAnalysis.reasons,
  };
}
