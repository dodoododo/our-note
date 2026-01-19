// Generate complementary color schemes from a primary color
export const generateThemeFromColor = (primaryHue: number) => {
  // Generate a cohesive color scheme based on color theory
  const complementary = (primaryHue + 180) % 360;
  const triadic1 = (primaryHue + 120) % 360;
  const analogous1 = (primaryHue + 30) % 360;
  
  return {
    primary: `hsl(${primaryHue}, 70%, 58%)`,
    primaryDark: `hsl(${primaryHue}, 70%, 48%)`,
    primaryLight: `hsl(${primaryHue}, 70%, 95%)`,
    secondary: `hsl(${complementary}, 65%, 58%)`,
    accent: `hsl(${triadic1}, 68%, 58%)`,
    accentAlt: `hsl(${analogous1}, 65%, 58%)`,
    gradient: `linear-gradient(135deg, hsl(${primaryHue}, 70%, 58%), hsl(${analogous1}, 68%, 60%))`,
    gradientAlt: `linear-gradient(135deg, hsl(${primaryHue}, 70%, 58%), hsl(${triadic1}, 68%, 58%))`,
  };
};

export const themePresets = [
  { name: 'Blurple', hue: 250, color: 'hsl(250, 70%, 58%)' },
  { name: 'Ocean', hue: 200, color: 'hsl(200, 70%, 58%)' },
  { name: 'Forest', hue: 140, color: 'hsl(140, 60%, 45%)' },
  { name: 'Sunset', hue: 25, color: 'hsl(25, 75%, 58%)' },
  { name: 'Rose', hue: 330, color: 'hsl(330, 70%, 58%)' },
  { name: 'Lavender', hue: 270, color: 'hsl(270, 60%, 65%)' },
  { name: 'Mint', hue: 160, color: 'hsl(160, 55%, 55%)' },
  { name: 'Coral', hue: 10, color: 'hsl(10, 75%, 60%)' },
];