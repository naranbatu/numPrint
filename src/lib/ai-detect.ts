// ── Browser extension detection ──

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

const AI_EXTENSION_IDS = [
  "mhnlakgilnojmhinhkckjpncpbhabphi", // ChatGPT for Google
  "jgjaeacdkonaoafenlfkkkmbaopkbilf",  // ChatGPT Writer
  "liecbddmkiiihnedobmlmillhodjkdmb", // Monica
  "iifphpkifgiafjbkonnhajdmkckplhkl", // Merlin
  "mrgkiipfnmcjdgpjimgfndjhbajkpdeb", // MaxAI
  "difoiogjjojoaoomphldepapgpbgkhkbh", // Sider
  "jgnjhbbhcnkihpoednacfnaaiggmdagc", // ChatGPT Sidebar
  "bnolenpfbpojjjjknobjponkjfmbanfh", // Codeium
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

function checkExtensionResources(): Promise<string[]> {
  const found: string[] = [];
  const checks = AI_EXTENSION_IDS.map((id) =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { found.push(id); resolve(); };
      img.onerror = () => resolve();
      img.src = `chrome-extension://${id}/icon.png`;
      setTimeout(resolve, 500);
    })
  );
  return Promise.all(checks).then(() => found);
}

function checkGlobalVariables(): string[] {
  const found: string[] = [];
  for (const name of AI_GLOBALS) {
    if (name in window) found.push(`window.${name}`);
  }
  return found;
}

// ── AI tab detection (recent visits) ──

const AI_SITES = [
  "chat.openai.com", "chatgpt.com",
  "claude.ai", "anthropic.com",
  "gemini.google.com", "bard.google.com",
  "copilot.microsoft.com", "copilot.github.com",
  "perplexity.ai",
  "phind.com",
  "codeium.com",
  "you.com",
  "poe.com",
  "deepseek.com", "chat.deepseek.com",
  "huggingface.co/chat",
  "cursor.com",
];

function checkPerformanceEntries(): string[] {
  const found: string[] = [];
  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    for (const entry of entries) {
      for (const site of AI_SITES) {
        if (entry.name.includes(site)) {
          found.push(site);
          break;
        }
      }
    }
  } catch { /* not supported */ }
  return [...new Set(found)];
}

function checkReferrer(): string | null {
  try {
    const ref = document.referrer.toLowerCase();
    for (const site of AI_SITES) {
      if (ref.includes(site)) return site;
    }
  } catch { /* skip */ }
  return null;
}

function checkRecentAiVisits(): string[] {
  const found: string[] = [];

  const referrer = checkReferrer();
  if (referrer) found.push(`referrer:${referrer}`);

  const perfHits = checkPerformanceEntries();
  for (const hit of perfHits) found.push(`resource:${hit}`);

  // Check localStorage/sessionStorage for AI tool traces
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
          found.push(`storage:${key}`);
          break;
        }
      }
    }
  } catch { /* blocked */ }

  return found;
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
  /\/\/\s*.*\n\s*\/\/\s*.*\n\s*\/\/\s*.*/,  // 3+ consecutive comments
  /\bdef\s+solve\b/i,
  /\bdef\s+main\b.*\bsolve\b/i,
  /\bint\s+main\s*\(\s*\)\s*\{[\s\S]*?\/\//,
  /using\s+namespace\s+std;\s*\n\s*\n\s*\/\//,
  /import\s+sys\s*\n.*input/,
];

export function analyzeCodeForAi(code: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Check comment patterns
  for (const pattern of AI_COMMENT_PATTERNS) {
    if (pattern.test(code)) {
      score += 15;
      reasons.push(`comment:${pattern.source.slice(0, 30)}`);
    }
  }

  // Check code patterns
  for (const pattern of AI_CODE_PATTERNS) {
    if (pattern.test(code)) {
      score += 10;
      reasons.push(`code_pattern`);
    }
  }

  // High comment-to-code ratio
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

  // Very consistent line lengths (AI tends to wrap uniformly)
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

// ── Main detection (combines all) ──

export type DetectResult = {
  detected: boolean;
  extensions: string[];
  aiTabs: string[];
  codeScore: number;
  codeReasons: string[];
};

export async function detectAiExtensions(code?: string): Promise<DetectResult> {
  const domHits = checkDomElements();
  const globalHits = checkGlobalVariables();
  const extensionHits = await checkExtensionResources();
  const aiTabHits = checkRecentAiVisits();

  const extensions = [
    ...domHits.map((s) => `dom:${s}`),
    ...globalHits.map((s) => `global:${s}`),
    ...extensionHits.map((s) => `ext:${s}`),
  ];

  const codeAnalysis = code ? analyzeCodeForAi(code) : { score: 0, reasons: [] };

  return {
    detected: extensions.length > 0 || aiTabHits.length > 0 || codeAnalysis.score >= 30,
    extensions,
    aiTabs: aiTabHits,
    codeScore: codeAnalysis.score,
    codeReasons: codeAnalysis.reasons,
  };
}
