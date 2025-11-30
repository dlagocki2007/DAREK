import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// NOTE: Ideally this is handled securely on a backend, but for this demo we use client-side env.
const apiKey = process.env.API_KEY || ''; 
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export interface AiResponse {
  text: string;
  correction?: string;
  isError?: boolean;
}

export const generateConversationResponse = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  userMessage: string,
  lessonContext: string
): Promise<AiResponse> => {
  // 1. Check for API Key
  if (!ai) {
    console.warn("Gemini API Key missing.");
    return { 
      text: "⚠️ Błąd konfiguracji: Brak klucza API. Uruchom aplikację z poprawnym kluczem w zmiennych środowiskowych.", 
      correction: "Brak klucza API.",
      isError: true
    };
  }

  try {
    // The history passed from PracticeEngine includes the current user message at the end.
    // We need to remove it for the Chat initialization, as sendMessage will handle the current turn.
    const historyForChat = history.slice(0, -1);

    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `You are a helpful and patient English teacher for a Polish student. 
      Context of current lesson: ${lessonContext}.
      
      Your task:
      1. Analyze the user's input for grammatical or vocabulary errors suitable for A1/A2 level.
      2. If there is a mistake, provide a polite correction in Polish.
      3. Continue the conversation naturally in simple English.
      
      Output format JSON:
      {
        "correction": "Optional correction in Polish or null if perfect",
        "reply": "Your reply in English"
      }`,
      },
      history: historyForChat
    });

    const result = await chat.sendMessage({ message: userMessage });
    const responseText = result.text; // Access text property directly

    if (!responseText) {
      throw new Error("Empty response from model");
    }

    // Clean up potential markdown formatting from JSON
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanJson);
      return {
        text: parsed.reply,
        correction: parsed.correction,
        isError: false
      };
    } catch (e) {
      // Fallback if model didn't return valid JSON, but returned text
      console.warn("JSON Parse warning, falling back to raw text", e);
      return {
        text: responseText,
        isError: false
      };
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let errorMessage = "Wystąpił nieoczekiwany błąd połączenia.";
    const errString = error.toString().toLowerCase();
    const errMsg = (error.message || "").toLowerCase();

    // Map specific error codes/messages to user friendly Polish text
    if (errString.includes('429') || errMsg.includes('quota') || errMsg.includes('resource exhausted')) {
      errorMessage = "⚠️ Limit zapytań wyczerpany (Quota Exceeded). Spróbuj ponownie później.";
    } else if (errString.includes('401') || errString.includes('403') || errMsg.includes('key') || errMsg.includes('permission')) {
      errorMessage = "⚠️ Błąd autoryzacji. Sprawdź poprawność klucza API.";
    } else if (errString.includes('503') || errString.includes('500') || errMsg.includes('overloaded') || errMsg.includes('internal')) {
      errorMessage = "⚠️ Serwer AI jest chwilowo niedostępny lub przeciążony. Spróbuj za chwilę.";
    } else if (errMsg.includes('fetch') || errMsg.includes('network')) {
      errorMessage = "⚠️ Błąd sieci. Sprawdź swoje połączenie z internetem.";
    } else if (errMsg.includes('candidate') || errMsg.includes('blocked')) {
      errorMessage = "⚠️ Odpowiedź została zablokowana przez filtry bezpieczeństwa.";
    }

    return { 
      text: errorMessage,
      isError: true 
    };
  }
};