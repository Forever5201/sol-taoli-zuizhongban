// AlphaQ 池子数据结构分析
const base64Data = "VVNEVC1VU0RDAAAAAAAAAAAAAAAAAAAJirBohG8RQ0s/NXTCCs1ah1E19bLtv8wSEzngr8WjV2zpAwAAAAAAAAAAAAABAQwRsAVO2eXkcBisloYfZE1yGIvvahYAAAAAje9qFgAAAAAMCgYGAQD8/eJ91/tXeeuchDVHh5x+qK/T9Nx7/iuclmq0/VhnBh310FnGsilsvF2k06GxmKqUj400wRdIULloRpRj803JhQDifdf7V3nrnIQ1R4ecfqiv0/Tce/4rnJZqtP1YZwYd9dBZxrIpbLxdpNOhsZiqlI+NNMEXSFC5aEaUY/NNyYUAzgEOYK/tsicXvWMZL1QUWj+WWjO7gtLHAp6yzh4ggmTG+nrzvtutOj1l82qryXQxsbvkwtL24OR8pgIDRS9dYdBZxrIpbLxdpNOhsZiqlI+NNMEXSFC5aEaUY/NNyYUAAAAAAAAAAAAAQLELr2gsAAAAAAAAAAAAAOh2SBcAAAAA0O2QLgAAAADQ7ZAuAAAACgAAAGQAAADoAwAAAAAAAADIF6gEAAAA4Hfa1OgAAAAAUFwYowEAANMpIlQCAAAAa24h1OgAAACUsSjV6AAAAEBAOtToAAAAwN8P1egAAACA8PoCAAAAACYAAAAAAAAAAChr7gAAAAC4CwAAAAAAAADodkgXAAAAAJQ1dwAAAAAA0O2QLgAAAAAAAAAAAAAAAAAAAAAAAAAAwusLAAAAAIBENlMCAAAAgIPhVAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const buffer = Buffer.from(base64Data, 'base64');

console.log('=== AlphaQ Pool Structure Analysis (672 bytes) ===\n');

let offset = 0;

function readString(len) {
  const str = buffer.slice(offset, offset + len).toString('utf8').replace(/\0+$/g, '');
  offset += len;
  return str;
}

function readPubkey() {
  const pk = buffer.slice(offset, offset + 32);
  offset += 32;
  return pk.toString('base64').slice(0, 10) + '...';
}

function readU64() {
  const val = buffer.readBigUInt64LE(offset);
  offset += 8;
  return val;
}

function readU32() {
  const val = buffer.readUInt32LE(offset);
  offset += 4;
  return val;
}

function readU16() {
  const val = buffer.readUInt16LE(offset);
  offset += 2;
  return val;
}

function readU8() {
  const val = buffer.readUInt8(offset);
  offset += 1;
  return val;
}

// 分析结构
console.log(`[${offset}] Pool Name (16 bytes): "${readString(16)}"`);

console.log(`\n=== Pubkeys ===`);
console.log(`[${offset}] Authority?:     ${readPubkey()}`);
console.log(`[${offset}] Token A Mint:   ${readPubkey()}`);
console.log(`[${offset}] Token B Mint:   ${readPubkey()}`);
console.log(`[${offset}] Token A Vault:  ${readPubkey()}`);
console.log(`[${offset}] Token B Vault:  ${readPubkey()}`);
console.log(`[${offset}] LP Mint:        ${readPubkey()}`);
console.log(`[${offset}] Pubkey 7:       ${readPubkey()}`);
console.log(`[${offset}] Pubkey 8:       ${readPubkey()}`);
console.log(`[${offset}] Pubkey 9:       ${readPubkey()}`);
console.log(`[${offset}] Pubkey 10:      ${readPubkey()}`);

console.log(`\n=== U64 Fields (Token Amounts & Config) ===`);
const reserve_a = readU64();
console.log(`[${offset - 8}] Reserve A: ${reserve_a.toString()}`);

const reserve_b = readU64();
console.log(`[${offset - 8}] Reserve B: ${reserve_b.toString()}`);

console.log(`\n[${offset}] LP Supply?: ${readU64().toString()}`);

for (let i = 0; i < 25; i++) {
  if (offset + 8 > buffer.length) break;
  const val = readU64();
  console.log(`[${offset - 8}] u64[${i}]: ${val.toString()}`);
}

console.log(`\nRemaining bytes: ${buffer.length - offset}`);

// 计算价格（如果 decimals 正常）
console.log(`\n=== Price Calculation Test ===`);
console.log(`Reserve A: ${reserve_a.toString()}`);
console.log(`Reserve B: ${reserve_b.toString()}`);

// 假设都是 6 decimals (USDC/USDT)
const price = Number(reserve_b) / Number(reserve_a);
console.log(`Price (B/A): ${price.toFixed(6)}`);




