"use client";

import { useState } from "react";

export default function AIDiagnosticPage() {
  const api = process.env.NEXT_PUBLIC_API_BASE;

  const [problem, setProblem] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!problem.trim()) return;

    setLoading(true);

    const res = await fetch(`${api}/ai/diagnostic`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ problem }),
    });

    const data = await res.json();
    setResult(data.diagnostic || "");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🤖 Analizar con IA</h1>

        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Describe el problema del vehículo..."
          className="w-full p-4 bg-slate-900 border rounded-xl mb-4"
        />

        <button
          onClick={handleAnalyze}
          className="bg-emerald-600 px-4 py-2 rounded-xl"
        >
          {loading ? "Analizando..." : "Analizar"}
        </button>

        {result && (
          <div className="mt-6 p-4 bg-slate-900 rounded-xl">
            <h2 className="font-bold mb-2">Resultado:</h2>
            <pre className="whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
