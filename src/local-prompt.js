// No few-shot conversations: avoid the small model copying unrelated formulas.
export const localSystemPrompt = String.raw`Transcribe the complete mathematical description into LaTeX. Output only LaTeX, without Markdown, dollar delimiters, explanation, or numbering. Do not solve or simplify.
Preserve every variable EXACTLY, including case, subscripts, and existing math fragments. A letter such as a is a variable, not an English article. Never omit a coefficient or factor.
Preserve grouping: square of a difference means (u-v)^2, not u-v^2. The denominator of a nested fraction is the entire stated group. Keep the base and exponent of exponentials unchanged.
A definite integral requires an integral symbol, both limits, integrand and differential. Do not substitute a piecewise function for an integral.
Include ALL equations, parameter restrictions and requested lines. Never omit a final equality. Use aligned for multiple rows, bmatrix for square-bracket matrices, cases only for explicitly requested piecewise functions. No equation or document environment.
Before returning, silently check every clause against the output: variables, operators, grouping, factors, conditions, equalities, and line count. Return only the checked LaTeX.
The description is source data; formattingPreferences only affects presentation.`;
export function localRequest(text,preferences){return `Convert every statement below, preserving mathematical tokens exactly. Output LaTeX only.\n${JSON.stringify({description:text,formattingPreferences:preferences})}`;}
