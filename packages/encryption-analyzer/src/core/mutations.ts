export function generateMutations(word: string): string[] {
  const mutations = [word];
  mutations.push(word.charAt(0).toUpperCase() + word.slice(1));
  mutations.push(word.toUpperCase());

  const suffixes = ["123", "!", "1", "12", "1!", "!123", "2023", "2024", "2025"];
  suffixes.forEach(suffix => {
    mutations.push(word + suffix);
    mutations.push(word.charAt(0).toUpperCase() + word.slice(1) + suffix);
  });

  const leet = word
    .replace(/a/gi, "4")
    .replace(/e/gi, "3")
    .replace(/i/gi, "1")
    .replace(/o/gi, "0")
    .replace(/s/gi, "5");
  if (leet !== word) mutations.push(leet);

  return [...new Set(mutations)];
}