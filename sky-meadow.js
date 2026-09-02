export const SKY_MEADOW_TIMING = Object.freeze({
  startDelay: 90,
  riseDuration: 185,
  doorDelay: 8
});

export const SKY_MEADOW_SETTINGS = Object.freeze({
  contactDepth: 38,
  tileSize: 64,
  terrainSize: 720
});

export function sampleSkyMeadowHeight(x, z) {
  const broad = Math.sin(x * .009 + Math.sin(z * .0065) * .82) * 5.4
    + Math.cos(z * .0076 + .8) * 4.35
    + Math.sin((x + z) * .0112 + 1.7) * 2.8;
  const rolling = Math.sin(Math.hypot(x + 54, z - 37) * .0125) * 2.05;
  const detail = Math.sin(x * .025 - .9) * Math.cos(z * .021 + .4) * .72;
  return broad + rolling + detail;
}

export const SKY_HILL_GLSL = `
  float hillHeight(vec2 p) {
    float broad = sin(p.x * .009 + sin(p.y * .0065) * .82) * 5.4
      + cos(p.y * .0076 + .8) * 4.35
      + sin((p.x + p.y) * .0112 + 1.7) * 2.8;
    float rolling = sin(length(p + vec2(54.0, -37.0)) * .0125) * 2.05;
    float detail = sin(p.x * .025 - .9) * cos(p.y * .021 + .4) * .72;
    return broad + rolling + detail;
  }
`;

export const SKY_NOISE_GLSL = `
  float meadowHash(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }
  float meadowNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(meadowHash(i), meadowHash(i + vec2(1.0, 0.0)), f.x),
      mix(meadowHash(i + vec2(0.0, 1.0)), meadowHash(i + vec2(1.0)), f.x),
      f.y
    );
  }
  float meadowFbm(vec2 p) {
    float value = meadowNoise(p) * .55;
    value += meadowNoise(p * 2.03 + 13.7) * .28;
    value += meadowNoise(p * 4.11 - 7.2) * .17;
    return value;
  }
`;
