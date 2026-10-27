// Made-up documents for the picture-import tests: plain drawings with the writing a real passport, visa, business card and
// badge carries. No real person's papers are ever put in the repository. Each kind has its own size so a test can tell
// which one it is looking at after the picture has been resized and saved.
const sharp = require('sharp');

const FONT = 'DejaVu Sans, Liberation Sans, Arial, sans-serif';
const MONO = 'DejaVu Sans Mono, Liberation Mono, monospace';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const line = (y, text, size = 44, font = FONT) => `<text x="40" y="${y}" font-size="${size}" font-family="${font}" fill="#111">${esc(text)}</text>`;
const sheet = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#fff"/>${body}</svg>`);

exports.SIZES = { passportFront: [1000, 700], visaPage: [1100, 700], businessCard: [1200, 700], cantonFairCard: [800, 1100], buyerPhoto: [600, 800] };

exports.draw = async (kind, who, format = 'png') => {
  const [w, h] = exports.SIZES[kind];
  let body = '';
  if (kind === 'passportFront') {
    body = line(90, 'PASSPORT', 64) + line(180, `Surname ${who.surname}`) + line(250, `Given names ${who.given}`) + line(320, `Nationality ${who.country}`) + line(390, `Date of expiry 05 JUL 2034`) +
      line(560, `${who.passport}`) + line(640, `P<UTO${who.surname}<<${who.given}<<<<<<<<<<<<<<<<`, 34, MONO);
  } else if (kind === 'visaPage') {
    body = line(90, 'Residence Permit', 56) + line(170, 'Category  Entries  Duration of Stay', 40) + line(250, 'Place of Issue GUANGZHOU  People\'s Republic of China', 36) + line(330, `${who.passport}`) +
      line(600, `R<CHN${who.surname}<<${who.given}<<<<<<<<<<<<<<<<`, 34, MONO);
  } else if (kind === 'businessCard') {
    body = line(120, `${who.given} ${who.surname}`, 64) + line(200, 'General Manager', 44) + line(290, `${who.email}`, 44) + line(370, 'WhatsApp +86 138 0013 8000', 44) + line(450, 'WeChat ' + who.wechat, 44) + line(530, 'Sunshine Trading Co., Ltd', 44);
  } else if (kind === 'cantonFairCard') {
    body = line(110, 'CHINA IMPORT AND EXPORT FAIR', 36) + line(200, 'Overseas BUYER', 48) + line(300, `${who.given} ${who.surname}`, 52) + line(1000, 'A901123456789012', 44);
  } else {
    // A portrait: just shapes, no writing.
    body = '<ellipse cx="300" cy="300" rx="150" ry="190" fill="#d9a384"/><rect x="120" y="500" width="360" height="300" rx="80" fill="#34495e"/>';
  }
  const img = sharp(sheet(w, h, body));
  return format === 'jpeg' ? img.jpeg({ quality: 90 }).toBuffer() : img.png().toBuffer();
};
