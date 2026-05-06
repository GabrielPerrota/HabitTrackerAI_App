export const generateHabitReport = async (data: any) => {
  const prompt = `Analise os seguintes dados de hábitos:
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
[Cite 3 metas claras para a semana seguinte, focando em consistência].`;

  try {
    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error("Failed to call backend API");
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível analisar os dados agora.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao processar sua solicitação.";
  }
};
