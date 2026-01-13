import { GoogleGenAI, Type } from "@google/genai";
import { MarketInsight, TradeLog, AuditResult, PositionHistory } from "../types";

// Helper to get client with dynamic key or fallback to env
const getClient = () => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new Error("Missing Gemini API Key. Ensure process.env.API_KEY is configured.");
  }
  return new GoogleGenAI({ apiKey: key });
};

// Helper to sanitize and parse JSON from LLM responses
const parseGeminiJSON = <T>(text: string | undefined, fallback: T): T => {
  if (!text) return fallback;
  try {
    // Remove markdown code blocks if present
    const cleanText = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleanText) as T;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return fallback;
  }
};

export const analyzeStrategy = async (history: PositionHistory[], targetWallet: string): Promise<MarketInsight> => {
  // Filter for meaningful history
  if (!history || history.length === 0) {
    return {
      summary: "Insufficient data to analyze strategy. Waiting for trade history...",
      riskLevel: "LOW",
      strategyGuess: "Data Pending"
    };
  }

  // Format the last 20 trades for the context window
  const tradeActivity = history.slice(0, 25).map(h => 
    `- [${h.date}] Market: "${h.market}" | Side: ${h.outcome} | Amt: $${h.amount.toFixed(0)} | PnL: ${h.pnl > 0 ? '+' : ''}$${h.pnl.toFixed(2)}`
  ).join('\n');

  const prompt = `
    You are a sophisticated algorithmic trading analyst for Polymarket (Prediction Markets).
    
    Target Wallet: ${targetWallet}
    
    Recent Trade History (Last 25 Positions):
    ${tradeActivity}

    Based strictly on the data above, analyze the trader's behavior:
    1. Market Focus: Are they betting on Politics, Crypto, Sports, or Pop Culture?
    2. Risk Profile: Do they take small safe bets or large degenerate gambles?
    3. Performance: Are they profitable recently?
    
    Output a JSON object with:
    - summary: A 1-sentence executive summary of their performance.
    - riskLevel: "LOW", "MEDIUM", or "HIGH".
    - strategyGuess: A short label for their style (e.g., "Whale Hedger", "High-Freq Scalper", "Political Pundit", "Degen Gambler").
  `;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            riskLevel: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
            strategyGuess: { type: Type.STRING }
          },
          required: ["summary", "riskLevel", "strategyGuess"]
        }
      }
    });

    return parseGeminiJSON<MarketInsight>(response.text, {
      summary: "Analysis failed to parse response.",
      riskLevel: "MEDIUM",
      strategyGuess: "Parsing Error"
    });

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    return {
      summary: "AI Analysis unavailable. Please check your API Key configuration.",
      riskLevel: "LOW",
      strategyGuess: "Connection Error"
    };
  }
};

export const analyzeCodeSecurity = async (code: string, fileName: string): Promise<AuditResult> => {
  const prompt = `
    You are an expert security auditor specializing in smart contracts, trading bots, and Node.js malware detection.
    File Name: ${fileName}
    
    CRITICAL: Check for "Supply Chain Attacks" and Stealer Malware patterns.
    - Look for suspicious imports like 'portal-lim', 'es-func', 'harhat-api' or similar obfuscated package names.
    - Look for 'require()' calls to unknown packages followed by weird method calls (e.g. '.mcpServerRip()', '.init()').
    - Look for code that accesses 'process.env' (private keys) and sends data to external servers.
    - Check for 'eval()', 'exec()', or obfuscated strings.
    
    Analyze the source code below for these vulnerabilities as well as standard logic errors.
    
    Source Code:
    ${code.slice(0, 100000)}
    
    Return the result in JSON format matching the schema.
    If vulnerabilities are found (especially malware), set isScam to true and severity to CRITICAL.
    Provide a remediated version that REMOVES the malicious code.
  `;

  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: "Security score from 0 (unsafe) to 100 (safe)" },
            isScam: { type: Type.BOOLEAN, description: "Whether the code exhibits scam/malicious behavior" },
            summary: { type: Type.STRING, description: "Executive summary of the audit" },
            vulnerabilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] },
                  description: { type: Type.STRING },
                  line: { type: Type.INTEGER }
                },
                required: ["type", "severity", "description"]
              }
            },
            remediatedCode: { type: Type.STRING, description: "Fixed version of the code if vulnerabilities exist" }
          },
          required: ["score", "isScam", "summary", "vulnerabilities"]
        }
      }
    });

    return parseGeminiJSON<AuditResult>(response.text, {
      score: 0,
      isScam: false,
      summary: "Failed to parse security analysis.",
      vulnerabilities: []
    });

  } catch (error: any) {
    console.error("Gemini Security Analysis Error:", error);
    return {
      score: 0,
      isScam: false,
      summary: error.message || "Analysis failed due to API error. Ensure your API Key is valid.",
      vulnerabilities: [{
        type: "System Error",
        severity: "MEDIUM",
        description: error.message || "Failed to analyze code due to an error."
      }]
    };
  }
};