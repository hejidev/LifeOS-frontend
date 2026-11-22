const COMMON = [
    "password", "passw0rd", "123456", "qwerty", "letmein", "welcome", "admin", "iloveyou",
    "abc123", "monkey", "dragon", "football", "secret", "naija", "lifeos",
  ];
  
  const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  
  function hasSequence(lower: string) {
    for (const sequence of SEQUENCES) {
      for (let index = 0; index <= sequence.length - 4; index += 1) {
        const part = sequence.slice(index, index + 4);
        if (lower.includes(part) || lower.includes([...part].reverse().join(""))) return true;
      }
    }
    return false;
  }
  
  export function scorePasswordStrength(password: string): number {
    if (!password) return 0;
    const lower = password.toLowerCase();
  
    let pool = 0;
    if (/[a-z]/.test(password)) pool += 26;
    if (/[A-Z]/.test(password)) pool += 26;
    if (/\d/.test(password)) pool += 10;
    if (/[^A-Za-z0-9]/.test(password)) pool += 33;
  
    const unique = new Set(password).size;
    const effective = Math.min(password.length, unique * 2);
    let bits = effective * Math.log2(Math.max(pool, 2));
  
    if (COMMON.some((word) => lower.includes(word))) bits = Math.min(bits * 0.5, 30);
    if (hasSequence(lower)) bits *= 0.75;
    if (/(.{2,})\1+/.test(password)) bits *= 0.8;
  
    return Math.max(0, Math.min(100, Math.round((bits / 80) * 100)));
  }
  
  export function strengthLabelOf(score: number): "weak" | "medium" | "strong" {
    if (score >= 70) return "strong";
    if (score >= 40) return "medium";
    return "weak";
  }
  
  const SETS = {
    lower: "abcdefghijkmnopqrstuvwxyz",
    upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
    digits: "23456789",
    symbols: "!@#$%^&*()-_=+?",
  };
  
  function randomBelow(max: number) {
    const limit = Math.floor(0x1_0000_0000 / max) * max;
    const buffer = new Uint32Array(1);
    do {
      window.crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);
    return buffer[0] % max;
  }
  
  export function generatePassword(length = 20, symbols = true) {
    const groups = [SETS.lower, SETS.upper, SETS.digits, ...(symbols ? [SETS.symbols] : [])];
    const all = groups.join("");
    const chars = groups.map((group) => group[randomBelow(group.length)]);
    while (chars.length < length) chars.push(all[randomBelow(all.length)]);
    for (let index = chars.length - 1; index > 0; index -= 1) {
      const swap = randomBelow(index + 1);
      [chars[index], chars[swap]] = [chars[swap], chars[index]];
    }
    return chars.join("");
  }