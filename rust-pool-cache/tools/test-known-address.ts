import { Connection, PublicKey } from '@solana/web3.js';

async function test() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // 测试一个已知的 Raydium AMM V4 地址
  const knownRaydiumAddress = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2'; // SOL/USDC
  
  console.log('测试已知的 Raydium 地址...');
  console.log(`地址: ${knownRaydiumAddress}`);
  
  try {
    const pubkey = new PublicKey(knownRaydiumAddress);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (accountInfo) {
      console.log('✅ 查询成功！');
      console.log(`   程序 ID: ${accountInfo.owner.toString()}`);
      console.log(`   数据大小: ${accountInfo.data.length} bytes`);
    } else {
      console.log('❌ 账户不存在');
    }
  } catch (error) {
    console.log('❌ 查询失败:', error);
  }
  
  // 测试一个 "SolFi V2" 地址
  console.log('\n测试 "SolFi V2" 地址...');
  const solfiAddress = '65ZHSArs5XxPseKQbB1B4r16vDxMWnCxHMzogDAqiDUc';
  console.log(`地址: ${solfiAddress}`);
  
  try {
    const pubkey = new PublicKey(solfiAddress);
    const accountInfo = await connection.getAccountInfo(pubkey);
    
    if (accountInfo) {
      console.log('✅ 查询成功！');
      console.log(`   程序 ID: ${accountInfo.owner.toString()}`);
      console.log(`   数据大小: ${accountInfo.data.length} bytes`);
    } else {
      console.log('❌ 账户不存在 - 这证实了该地址可能是 Jupiter 的内部标识符');
    }
  } catch (error: any) {
    console.log('❌ 查询失败:', error.message);
  }
}

test();

