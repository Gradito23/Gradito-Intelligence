/**
 * Helpers for OpenAI model UX and request shaping.
 * Keep patterns in sync with integration-openai invoke_llm temperature logic.
 */

const RECOMMENDED_EXACT = new Set([
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
  'gpt-4.1-nano',
]);

/** Reasoning / fixed-parameter model families (temperature often unsupported). */
export function isReasoningModel(modelId) {
  if (!modelId || typeof modelId !== 'string') return false;
  const id = modelId.trim().toLowerCase();
  return /^o[0-9]/.test(id) || id.startsWith('gpt-5');
}

export function isRecommendedChatModel(modelId) {
  if (!modelId || typeof modelId !== 'string') return false;
  const id = modelId.trim().toLowerCase();
  if (RECOMMENDED_EXACT.has(id)) return true;
  // Allow dated variants like gpt-4o-mini-2024-07-18
  return (
    id.startsWith('gpt-4o-mini')
    || id.startsWith('gpt-4o-')
    || id === 'gpt-4o'
    || id.startsWith('gpt-4.1-mini')
    || id.startsWith('gpt-4.1-nano')
    || (id.startsWith('gpt-4.1') && !id.includes('codex'))
  ) && !isReasoningModel(id);
}
