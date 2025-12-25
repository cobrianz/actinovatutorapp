// src/lib/rate-limit.js
const store = new Map();

export default function rateLimit({ interval, max }) {
  return {
    async check(key) {
      const now = Date.now();
      const record = store.get(key) || { count: 0, resetTime: now + interval };

      if (now > record.resetTime) {
        store.set(key, { count: 1, resetTime: now + interval });
        return;
      }

      record.count += 1;
      store.set(key, record);

      if (record.count > max) {
        throw new Error("Rate limit exceeded");
      }
    },
  };
}