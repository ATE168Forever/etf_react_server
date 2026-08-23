// Identity proxy: `styles.someClass` resolves to the string 'someClass',
// matching real CSS Modules output closely enough for tests that assert
// on generated class names (e.g. `expect(el.className).toMatch(/foo/)`).
export default new Proxy(
  {},
  {
    get: (target, key) => {
      if (key === '__esModule') return false;
      if (typeof key === 'symbol') return undefined;
      return key;
    },
  },
);
