// A made-up photo of a 12306 train receipt: a dense QR code on a paper with text lines, turned a little, soft, in a shadow with a
// patch of glare, saved as a lossy JPEG -- the kind of picture a phone takes at the station. The code holds a 12306-style link.
const sharp = require('sharp');
const QRCode = require('qrcode');

exports.RECEIPT_QR_TEXT = 'https://p.12306.cn/tservice/qr/dz/v1?abc=mKpfFrv8doFi64XCyAhQSA==&xyz=QKSFP5tpjxcDkRoJqNSLZ1b2sQ9uV7Wc3Xa8Yd4Ee5Fg6Hh7Ii8Jj9Kk0LlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789AbCdEfGhIjKlMnOpQrStUvWxYz';

exports.make = async () => {
  const qr = await QRCode.toBuffer(exports.RECEIPT_QR_TEXT, { width: 430, margin: 2, errorCorrectionLevel: 'L' });
  const W = 1500, H = 2000;
  const page = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#f3f3ef"/>
    ${Array.from({ length: 9 }, (_, i) => `<rect x="120" y="${120 + i * 70}" width="${700 + (i % 3) * 200}" height="26" fill="#222"/>`).join('')}
    <rect x="120" y="790" width="1100" height="4" fill="#222"/></svg>`);
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.45" stop-color="#000" stop-opacity="0.55"/><stop offset="0.5" stop-color="#000" stop-opacity="0"/></linearGradient><radialGradient id="r"><stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <polygon points="0,900 ${W},1300 ${W},${H} 0,${H}" fill="url(#g)"/><ellipse cx="1000" cy="1250" rx="260" ry="200" fill="url(#r)"/></svg>`);
  const flat = await sharp(page).composite([{ input: qr, left: 330, top: 900 }, { input: shadow, left: 0, top: 0 }]).png().toBuffer();
  const jpeg = await sharp(flat).rotate(9, { background: '#555' }).blur(2.0).modulate({ brightness: 0.95 }).jpeg({ quality: 55 }).toBuffer();
  return { jpeg, text: exports.RECEIPT_QR_TEXT };
};
