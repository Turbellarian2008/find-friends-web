(function(){
  // Simple DFA trie for sensitive word detection
  const Sensitive = {
    _trie: null,
    _loaded: false,
    _loading: null,
    _normalize(s){
      if (!s) return '';
      // Lowercase and trim. You can extend: remove spaces/punctuations if needed
      return String(s).toLowerCase();
    },
    _insert(word){
      if (!word) return;
      let node = this._trie;
      for (const ch of word) {
        if (!node.next[ch]) node.next[ch] = { next: Object.create(null), end: false };
        node = node.next[ch];
      }
      node.end = true;
    },
    _build(words){
      this._trie = { next: Object.create(null), end: false };
      (words||[]).forEach(w=>{
        const n = this._normalize(w).trim();
        if (n) this._insert(n);
      });
    },
    async ensureReady(){
      if (this._loaded) return;
      if (this._loading) return this._loading;
      this._loading = (async () => {
        try {
          // Try KV-backed API first
          let words = [];
          try {
            const apiRes = await fetch('/api/sensitiveLexicon', { cache: 'no-store' });
            if (apiRes.ok) {
              const body = await apiRes.json();
              if (body && body.code === 0 && Array.isArray(body.data)) words = body.data;
            }
          } catch {}
          // Fallback to local file
          if (!Array.isArray(words) || words.length === 0) {
            const res = await fetch('./sensitive.json', { cache: 'no-store' });
            words = res.ok ? await res.json() : [];
          }
          this._build(Array.isArray(words) ? words : []);
          this._loaded = true;
        } catch {
          // Fallback to empty trie to avoid blocking UI
          this._build([]);
          this._loaded = true;
        }
      })();
      return this._loading;
    },
    // Return true if any match exists
    has(text){
      if (!this._trie) return false;
      const s = this._normalize(text);
      const root = this._trie;
      const n = s.length;
      for (let i=0; i<n; i++){
        let node = root;
        let j = i;
        while (j<n){
          const ch = s[j];
          node = node.next[ch];
          if (!node) break;
          if (node.end) return true;
          j++;
        }
      }
      return false;
    },
    // Optionally expose find for debugging
    find(text, limit=5){
      const matches = [];
      if (!this._trie) return matches;
      const s = this._normalize(text);
      const root = this._trie;
      const n = s.length;
      for (let i=0; i<n && matches.length<limit; i++){
        let node = root;
        let j = i;
        let lastEnd = -1;
        while (j<n){
          const ch = s[j];
          node = node.next[ch];
          if (!node) break;
          if (node.end) lastEnd = j;
          j++;
        }
        if (lastEnd >= i){ matches.push(s.slice(i, lastEnd+1)); }
      }
      return matches;
    }
  };
  window.Sensitive = Sensitive;
})();
