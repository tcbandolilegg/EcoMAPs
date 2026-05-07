/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";

import { Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getRecyclingTips(lang: Language = 'pt-BR') {
  const languageNames = {
    'pt-BR': 'Português do Brasil',
    'pt-PT': 'Português de Portugal',
    'en': 'English'
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Dê 5 dicas práticas e rápidas de reciclagem para o dia a dia e explique brevemente o impacto ambiental positivo de cada uma. Retorne em formato JSON como uma lista de objetos com 'topic', 'content' e 'impactLabel'. Responda em ${languageNames[lang]}.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error fetching tips:", error);
    return [
      {
        topic: "Lave os recipientes",
        content: "Restos de comida podem contaminar outros materiais recicláveis.",
        impactLabel: "Aumenta a eficiência da triagem"
      }
    ];
  }
}

export async function getWasteImpact(item: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Explique o impacto ambiental do descarte incorreto de '${item}' e como a reciclagem ajuda. Responda de forma curta e impactante em Português do Brasil.`,
    });
    return response.text;
  } catch (error) {
    return "O descarte correto reduz a poluição do solo e da água.";
  }
}
