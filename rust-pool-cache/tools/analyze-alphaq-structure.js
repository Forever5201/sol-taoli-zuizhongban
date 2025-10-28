// AlphaQ 池子数据结构分析工具
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('E:/6666666666666666666666666666/dex-cex/dex-sol/rust-pool-cache/alphaq-pool-data-utf8.json', 'utf8'));
const buffer = Buffer.from(data.account.data[0], 'base64');

console.log('=== AlphaQ Pool Structure Analysis ===\n');
console.log(`Total size: ${buffer.length} bytes`);
console.log(`Owner: ${data.account.owner}\n`);

let offset = 0;

// 读取字符串
function readString(length) {
  const str = buffer.slice(offset, offset + length).toString('utf8').replace(/\0/g, '');
  offset += length;
  return str;
}

// 读取 Pubkey
function readPubkey() {
  const pubkey = buffer.slice(offset, offset + 32);
  offset += 32;
  return pubkey.toString('base64').slice(0, 20) + '...';
}

// 读取 u64
function readU64() {
  const value = buffer.readBigUInt64LE(offset);
  offset += 8;
  return value;
}

// 读取 u32
function readU32() {
  const value = buffer.readUInt32LE(offset);
  offset += 4;
  return value;
}

// 读取 u8
function readU8() {
  const value = buffer.readUInt8(offset);
  offset += 1;
  return value;
}

console.log('--- 字段解析 ---\n');

// 前 16 bytes 看起来是标识符
console.log(`[${offset}] Pool Name/ID: ${readString(16)}`);

// Pubkeys
console.log(`\n--- Pubkeys (32 bytes each) ---`);
console.log(`[${offset}] Pubkey 1 (可能是 authority): ${readPubkey()}`);
console.log(`[${offset}] Pubkey 2 (可能是 token_a_mint): ${readPubkey()}`);
console.log(`[${offset}] Pubkey 3 (可能是 token_b_mint): ${readPubkey()}`);
console.log(`[${offset}] Pubkey 4 (可能是 token_a_vault): ${readPubkey()}`);
console.log(`[${offset}] Pubkey 5 (可能是 token_b_vault): ${readPubkey()}`);
console.log(`[${offset}] Pubkey 6 (可能是 lp_mint): ${readPubkey()}`);
console.log(`[${offset}] Pubkey 7: ${readPubkey()}`);
console.log(`[${offset}] Pubkey 8: ${readPubkey()}`);
console.log(`[${offset}] Pubkey 9: ${readPubkey()}`);
console.log(`[${offset}] Pubkey 10: ${readPubkey()}`);

// u64 字段
console.log(`\n--- u64 字段 (8 bytes each) ---`);
for (let i = 0; i < 20; i++) {
  const value = readU64();
  console.log(`[${offset - 8}] u64[${i}]: ${value.toString()}`);
  
  if (offset >= buffer.length) break;
}

console.log(`\n剩余字节: ${buffer.length - offset}`);
console.log(`\n=== 结构推测 ===`);
console.log(`16 bytes: Pool identifier/name`);
console.log(`10 * 32 = 320 bytes: Pubkeys`);
console.log(`~42 * 8 = 336 bytes: u64 配置字段`);
console.log(`总计: 16 + 320 + 336 = 672 bytes ✓`);

