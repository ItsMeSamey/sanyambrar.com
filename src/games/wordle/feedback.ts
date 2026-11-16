export function letterFeedback(mask: string): string {
  return mask === 'g' ? 'correct position' : mask === 'y' ? 'present in another position' : mask === 'r' ? 'absent' : mask === 'b' ? 'revealed' : 'not submitted';
}

export function describeGuess(word: string, mask: string): string {
  if (!word.trim()) return 'Empty guess';
  return [...word].map((letter, index) => `Position ${index + 1}: ${letter.trim() ? letter.toUpperCase() : 'empty'}, ${letterFeedback(mask[index] ?? '')}`).join('; ');
}
