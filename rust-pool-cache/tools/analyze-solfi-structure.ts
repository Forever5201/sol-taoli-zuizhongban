import { Connection, PublicKey } from '@solana/web3.js';

const SOLFI_POOL_1 = '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc';
const SOLFI_POOL_2 = 'FkEB6uvyzuoaGpgs4yRtFtxC4WJxhejNFbUkj5R6wR32';

async function analyzeSolFiStructure() {
  console.log('=== SolFi V2 Structure Analysis (1728 bytes) ===\n');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  const pubkey = new PublicKey(SOLFI_POOL_1);
  const accountInfo = await connection.getAccountInfo(pubkey);
  
  if (!accountInfo) {
    console.log('Pool not found');
    return;
  }
  
  console.log(`Owner: ${accountInfo.owner.toBase58()}`);
  console.log(`Data length: ${accountInfo.data.length} bytes\n`);
  
  const data = accountInfo.data;
  let offset = 0;
  
  function readPubkey() {
    const pk = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    return pk.toBase58().slice(0, 8) + '...';
  }
  
  function readU64() {
    const val = data.readBigUInt64LE(offset);
    offset += 8;
    return val;
  }
  
  function readU32() {
    const val = data.readUInt32LE(offset);
    offset += 4;
    return val;
  }
  
  function readU8() {
    const val = data.readUInt8(offset);
    offset += 1;
    return val;
  }
  
  console.log('=== Field Analysis ===\n');
  
  // 尝试解析 Pubkeys
  console.log('--- Pubkeys (32 bytes each) ---');
  for (let i = 0; i < 20; i++) {
    if (offset + 32 > data.length) break;
    const pk = readPubkey();
    console.log(`[${offset - 32}] Pubkey ${i}: ${pk}`);
  }
  
  console.log(`\n--- U64 Fields (8 bytes each) ---`);
  for (let i = 0; i < 50; i++) {
    if (offset + 8 > data.length) break;
    const val = readU64();
    
    // Highlight potential reserve amounts (large numbers)
    if (val > 1000000n && val < 1000000000000000000n) {
      console.log(`[${offset - 8}] u64[${i}]: ${val.toString()} ⭐ (potential reserve)`);
    } else {
      console.log(`[${offset - 8}] u64[${i}]: ${val.toString()}`);
    }
  }
  
  console.log(`\nRemaining bytes: ${data.length - offset}`);
  console.log(`\n=== Structure Summary ===`);
  console.log(`Total: 1728 bytes`);
  console.log(`Likely: ~20 Pubkeys (640 bytes) + ~136 u64 (1088 bytes)`);
  console.log(`Or: ~25 Pubkeys (800 bytes) + ~116 u64 (928 bytes)`);
}

analyzeSolFiStructure().catch(console.error);




