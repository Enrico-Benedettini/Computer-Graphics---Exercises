
// random generator.
// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
export const mulberry32 = (a) => {
    return function(min = 0, max = 4294967295) {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      const delta = max - min;
      return ((t ^ t >>> 14) >>> 0) % delta + min;
    }
}

