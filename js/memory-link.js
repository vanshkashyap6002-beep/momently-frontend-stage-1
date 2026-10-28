/* Validate without serializing through URL.href: preserve the supplied destination. */
(function (root) {
  "use strict";
  function validateMemoryLink(value) {
    if (typeof value !== "string") return null;
    const text = value.trim();
    if (!/^https:\/\//i.test(text) || /[\s\u0000-\u001f\u007f\\<>"]/.test(text)) return null;
    try {
      const parsed = new URL(text);
      if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) return null;
      return text;
    } catch { return null; }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { validateMemoryLink };
  else root.ChermoMemoryLink = { validateMemoryLink };
})(typeof window !== "undefined" ? window : globalThis);
