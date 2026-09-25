function getLuminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16) / 255);
  const a = rgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1, hex2) {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const colors = {
  bgMain: '#F8F4EC',        // Fundo do site e do modal
  bgCard: '#EAE0D2',        // Fundo de cards/resumos
  bgInput: '#FAF7F0',       // Fundo de inputs
  textDark: '#261811',      // Marrom café ultra-escuro (títulos, nomes, números)
  textMedium: '#453126',    // Marrom encorpado (secundários)
  textLabel: '#543D30',     // Labels (Local, Traje, etc.)
  accent: '#73563E',        // Detalhes / botões
  borderLine: '#967D67',    // Bordas e divisórias novas
};

console.log('================================================================');
console.log('AUDITORIA DE CONTRASTE WCAG 2.1 AA — APÓS AJUSTES');
console.log('================================================================\n');

const tests = [
  { name: '1. Texto Principal (#261811) sobre Fundo (#F8F4EC)', fg: colors.textDark, bg: colors.bgMain },
  { name: '2. Títulos e Corpo (#453126) sobre Fundo (#F8F4EC)', fg: colors.textMedium, bg: colors.bgMain },
  { name: '3. Labels (#543D30) sobre Fundo (#F8F4EC)', fg: colors.textLabel, bg: colors.bgMain },
  { name: '4. Accent/Detalhes (#73563E) sobre Fundo (#F8F4EC)', fg: colors.accent, bg: colors.bgMain },
  { name: '5. Bordas e Linhas (#967D67) sobre Fundo (#F8F4EC)', fg: colors.borderLine, bg: colors.bgMain, isUi: true },
  { name: '6. Texto em Card Interno (#261811) sobre (#EAE0D2)', fg: colors.textDark, bg: colors.bgCard },
  { name: '7. Labels em Card Interno (#543D30) sobre (#EAE0D2)', fg: colors.textLabel, bg: colors.bgCard },
  { name: '8. Texto em Input (#261811) sobre (#FAF7F0)', fg: colors.textDark, bg: colors.bgInput },
  { name: '9. Botão Escuro: Texto (#F8F4EC) sobre (#261811)', fg: colors.bgMain, bg: colors.textDark },
];

tests.forEach(t => {
  const ratio = getContrastRatio(t.fg, t.bg);
  const minRequired = t.isUi ? 3.0 : 4.5;
  const passAA = ratio >= minRequired;
  const passAAA = ratio >= 7.0;
  const status = passAAA ? '✅ PASSOU AAA' : (passAA ? '✅ PASSOU AA' : '❌ REPROVOU');
  
  console.log(`${t.name}`);
  console.log(`   Razão: ${ratio.toFixed(2)}:1 | Mínimo exigido: ${minRequired}:1 | ${status}`);
  console.log('');
});
