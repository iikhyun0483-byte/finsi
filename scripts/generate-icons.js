const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, "../public/icons");

// SVG 로고 생성 (FINSI)
const createSVG = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 배경 -->
  <rect width="${size}" height="${size}" fill="#080810" rx="${size * 0.15}"/>

  <!-- 그라데이션 정의 -->
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- F 문자 (FINSI의 F) -->
  <text
    x="${size / 2}"
    y="${size / 2 + size * 0.15}"
    font-family="Arial, sans-serif"
    font-size="${size * 0.5}"
    font-weight="bold"
    fill="url(#grad)"
    text-anchor="middle">F</text>

  <!-- 하단 작은 텍스트 -->
  <text
    x="${size / 2}"
    y="${size * 0.85}"
    font-family="Arial, sans-serif"
    font-size="${size * 0.12}"
    fill="#6b7280"
    text-anchor="middle">FINSI</text>
</svg>
`;

async function generateIcons() {
  console.log("🎨 PWA 아이콘 생성 시작...");

  // icons 디렉토리 확인
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  for (const size of sizes) {
    const svg = createSVG(size);
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✅ ${size}x${size} 아이콘 생성 완료`);
    } catch (error) {
      console.error(`❌ ${size}x${size} 아이콘 생성 실패:`, error);
    }
  }

  console.log("✨ 모든 아이콘 생성 완료!");
}

generateIcons().catch(console.error);
