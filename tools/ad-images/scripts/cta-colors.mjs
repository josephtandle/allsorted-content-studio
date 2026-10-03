export function resolveCtaColors({ accent, ink, canvas, surface = canvas }) {
  const parse = value => {
    const match = String(value || '').trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (!match) return null;
    const hex = match[1].length === 3 ? [...match[1]].map(char => char + char).join('') : match[1];
    return [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
  };
  const luminance = value => {
    const channels = parse(value);
    if (!channels) return null;
    const [red, green, blue] = channels.map(channel => channel / 255).map(channel =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const contrast = (foreground, background) => {
    const a = luminance(foreground), b = luminance(background);
    return a === null || b === null ? 0 : (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };

  let button = accent;
  let text = [ink, canvas].sort((a, b) => contrast(b, button) - contrast(a, button))[0];
  if (contrast(text, button) < 4.5) {
    const channels = parse(button);
    if (channels) {
      // A surface-inaccessible accent may be lightened to retain the orange brand
      // treatment; button darkening remains the fallback only if both text colors fail.
      for (let step = 1; step <= 120 && contrast(text, button) < 4.5 && contrast(button, surface) < 4.5; step++) {
        const factor = step / 120;
        button = `#${channels.map(channel => Math.round(channel + (255 - channel) * factor).toString(16).padStart(2, '0')).join('')}`;
        text = [ink, canvas].sort((a, b) => contrast(b, button) - contrast(a, button))[0];
      }
      const darkenFrom = parse(button);
      for (let step = 1; step <= 120 && Math.max(contrast(ink, button), contrast(canvas, button)) < 4.5; step++) {
        const factor = 1 - step / 120;
        button = `#${darkenFrom.map(channel => Math.round(channel * factor).toString(16).padStart(2, '0')).join('')}`;
      }
      text = [ink, canvas].sort((a, b) => contrast(b, button) - contrast(a, button))[0];
    }
  }
  return { button, text, contrastRatio: contrast(text, button) };
}
