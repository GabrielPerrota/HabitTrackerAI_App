import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateHabitReport = async (data: any) => {
  const result = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analise os seguintes dados de hábitos:
${JSON.stringify(data, null, 2)}

DIRETRIZES:
1. Use linguagem simples e direta.
2. Identifique padrões nos dados recebidos.
3. Foque em micro-mudanças para reduzir a fricção baseando-se em James Clear (Hábitos Atômicos).
4. Estruture o relatório com: resumo, análise por hábito importante e um plano de ação prático.

IMPORTANTE: Use sempre os nomes reais dos hábitos (Labels) e seus respectivos Emojis presentes no objeto 'habits'.

Formate o relatório em Markdown com foco absoluto em clareza e elegância. Siga esta estrutura rigorosamente:
# 📊 Relatório Semanal: [Semana]

## 🚀 Resumo
[Escreva um texto motivador e analítico, limitado a 3 linhas].

## 🕵️ Análise de Padrões
Para cada hábito que mereça destaque (positivo ou negativo), crie um bloco seguindo este modelo:

### [Emoji do Hábito] [Nome do Hábito]
*   **O que observamos**
    [Fato direto e sem rodeios].
*   **Por que isso acontece?**
    [Explicação comportamental breve].
*   **Ajuste sugerido**
    [Ação prática e minúscula para facilitar a execução].

---

## 📋 Plano de Próximos Passos
[Cite 3 metas claras para a semana seguinte, focando em consistência].`,
    config: {
      systemInstruction: "Você é um especialista em formação de hábitos e psicologia comportamental.",
    },
  });

  return result.text || "Não foi possível analisar os dados agora.";
};
