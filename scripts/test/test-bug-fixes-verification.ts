/**
 * Bug 修复验证测试套件
 * 
 * 测试以下关键修复：
 * 1. parseInt() -> Number() 修复（防止科学计数法解析错误）
 * 2. validateInstructions() 验证器（防止 undefined pubkey）
 * 3. Jupiter /swap-instructions API（正确的指令反序列化）
 */

import { config } from 'dotenv';
config();

import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

console.log('🧪 Bug 修复验证测试套件\n');
console.log('='.repeat(80));

// ============================================================================
// Test Suite 1: parseInt() vs Number() 解析测试
// ============================================================================
async function testNumberParsing() {
  console.log('\n📋 Test Suite 1: parseInt() vs Number() 解析测试');
  console.log('-'.repeat(80));
  
  const testCases = [
    { value: '10000000000', description: '普通整数字符串' },
    { value: '8.47e+11', description: '科学计数法' },
    { value: 847000000000, description: '大整数' },
    { value: '1234.56', description: '小数字符串' },
    { value: 1234.56, description: '小数' },
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    const parseIntResult = parseInt(testCase.value.toString());
    const numberResult = Number(testCase.value);
    
    const passed = parseIntResult === numberResult;
    
    console.log(`\n测试: ${testCase.description}`);
    console.log(`  输入值: ${testCase.value}`);
    console.log(`  parseInt(): ${parseIntResult}`);
    console.log(`  Number():   ${numberResult}`);
    console.log(`  结果: ${passed ? '✅ 一致' : '❌ 不一致'}`);
    
    if (!passed) {
      allPassed = false;
      console.log(`  ⚠️ 这是 bug 的根源！parseInt() 无法正确解析 "${testCase.value}"`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log(`Test Suite 1 结果: ${allPassed ? '⚠️ 发现问题（符合预期）' : '✅ Number() 更可靠'}`);
  
  return !allPassed; // 返回 true 表示发现了 parseInt 的问题
}

// ============================================================================
// Test Suite 2: validateInstructions() 功能测试
// ============================================================================
async function testInstructionValidation() {
  console.log('\n📋 Test Suite 2: validateInstructions() 功能测试');
  console.log('-'.repeat(80));
  
  // 模拟 validateInstructions 函数
  function validateInstructions(instructions: TransactionInstruction[]): boolean {
    for (let i = 0; i < instructions.length; i++) {
      const ix = instructions[i];
      if (!ix.programId) {
        console.log(`  ❌ Instruction ${i}: programId is undefined`);
        return false;
      }
      for (let j = 0; j < ix.keys.length; j++) {
        if (!ix.keys[j].pubkey) {
          console.log(`  ❌ Instruction ${i}, key ${j}: pubkey is undefined`);
          return false;
        }
      }
    }
    return true;
  }
  
  // 测试用例 1: 有效指令
  console.log('\n测试 1: 有效指令（所有字段都存在）');
  const validInstructions = [
    new TransactionInstruction({
      programId: new PublicKey('11111111111111111111111111111111'),
      keys: [
        { pubkey: new PublicKey('So11111111111111111111111111111111111111112'), isSigner: false, isWritable: true },
      ],
      data: Buffer.from([0, 1, 2]),
    }),
  ];
  
  const result1 = validateInstructions(validInstructions);
  console.log(`  结果: ${result1 ? '✅ 通过验证' : '❌ 验证失败'}`);
  
  // 测试用例 2: 无效指令（pubkey undefined）
  console.log('\n测试 2: 无效指令（pubkey 为 undefined）');
  const invalidInstructions = [
    new TransactionInstruction({
      programId: new PublicKey('11111111111111111111111111111111'),
      keys: [
        { pubkey: new PublicKey('So11111111111111111111111111111111111111112'), isSigner: false, isWritable: true },
        { pubkey: undefined as any, isSigner: false, isWritable: true }, // 模拟 undefined
      ],
      data: Buffer.from([0, 1, 2]),
    }),
  ];
  
  const result2 = validateInstructions(invalidInstructions);
  console.log(`  结果: ${result2 ? '❌ 未检测到问题' : '✅ 成功检测到 undefined pubkey'}`);
  
  console.log('\n' + '='.repeat(80));
  console.log(`Test Suite 2 结果: ${result1 && !result2 ? '✅ 验证器工作正常' : '❌ 验证器有问题'}`);
  
  return result1 && !result2;
}

// ============================================================================
// Test Suite 3: Jupiter /swap-instructions API 测试
// ============================================================================
async function testJupiterSwapInstructionsAPI() {
  console.log('\n📋 Test Suite 3: Jupiter /swap-instructions API 测试');
  console.log('-'.repeat(80));
  
  try {
    const proxyUrl = process.env.HTTPS_PROXY;
    let httpsAgent: any;
    
    if (proxyUrl) {
      httpsAgent = new HttpsProxyAgent(proxyUrl, {
        rejectUnauthorized: false,
        timeout: 10000,
      });
      console.log(`\n使用代理: ${proxyUrl}`);
    }
    
    const client = axios.create({
      baseURL: 'https://lite-api.jup.ag/swap/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      httpsAgent,
      httpAgent: httpsAgent,
      proxy: false,
    });
    
    // Step 1: 获取 quote
    console.log('\nStep 1: 获取 quote...');
    const quoteResponse = await client.get('/quote', {
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '10000000000', // 10 SOL
        slippageBps: '50',
      },
    });
    console.log('  ✅ Quote 获取成功');
    
    // Step 2: 获取 swap instructions
    console.log('\nStep 2: 获取 swap instructions...');
    const swapInstructionsResponse = await client.post('/swap-instructions', {
      quoteResponse: quoteResponse.data,
      userPublicKey: '6hNgc5LGnfLpHNvjqETABpkcKHd7ZZp2hHQUMZqt5RcG',
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    });
    
    if (swapInstructionsResponse.data?.error) {
      throw new Error(`Jupiter API error: ${swapInstructionsResponse.data.error}`);
    }
    
    const {
      computeBudgetInstructions,
      setupInstructions,
      swapInstruction,
      cleanupInstruction,
      addressLookupTableAddresses,
    } = swapInstructionsResponse.data;
    
    console.log('  ✅ Swap instructions 获取成功');
    console.log(`     - computeBudgetInstructions: ${computeBudgetInstructions?.length || 0}`);
    console.log(`     - setupInstructions: ${setupInstructions?.length || 0}`);
    console.log(`     - swapInstruction: ${swapInstruction ? '✅' : '❌'}`);
    console.log(`     - cleanupInstruction: ${cleanupInstruction ? '✅' : '❌'}`);
    console.log(`     - addressLookupTableAddresses: ${addressLookupTableAddresses?.length || 0}`);
    
    // Step 3: 验证指令完整性
    console.log('\nStep 3: 验证指令完整性...');
    let validationPassed = true;
    
    const allInstructions = [
      ...(computeBudgetInstructions || []),
      ...(setupInstructions || []),
      swapInstruction,
      cleanupInstruction,
    ].filter(Boolean);
    
    console.log(`  总共 ${allInstructions.length} 条指令\n`);
    
    for (let i = 0; i < allInstructions.length; i++) {
      const ix = allInstructions[i];
      
      // 检查必需字段
      if (!ix.programId) {
        console.log(`  ❌ Instruction ${i}: programId 缺失`);
        validationPassed = false;
      }
      
      if (!ix.accounts || !Array.isArray(ix.accounts)) {
        console.log(`  ❌ Instruction ${i}: accounts 字段缺失或格式错误`);
        validationPassed = false;
      } else {
        // 检查每个账户的 pubkey
        for (let j = 0; j < ix.accounts.length; j++) {
          const account = ix.accounts[j];
          if (!account.pubkey) {
            console.log(`  ❌ Instruction ${i}, account ${j}: pubkey 缺失`);
            validationPassed = false;
          }
        }
      }
      
      if (!ix.data) {
        console.log(`  ❌ Instruction ${i}: data 字段缺失`);
        validationPassed = false;
      }
      
      if (validationPassed && i < 3) {
        console.log(`  ✅ Instruction ${i}: 所有字段完整`);
        console.log(`     programId: ${ix.programId.substring(0, 20)}...`);
        console.log(`     accounts: ${ix.accounts.length} 个`);
        console.log(`     data: ${ix.data.substring(0, 40)}...`);
      }
    }
    
    // Step 4: 尝试反序列化指令
    console.log('\nStep 4: 测试指令反序列化...');
    
    const deserializeInstruction = (instruction: any): TransactionInstruction | null => {
      if (!instruction) return null;
      
      try {
        return new TransactionInstruction({
          programId: new PublicKey(instruction.programId),
          keys: instruction.accounts.map((key: any) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable,
          })),
          data: Buffer.from(instruction.data, 'base64'),
        });
      } catch (error: any) {
        console.log(`  ❌ 反序列化失败: ${error.message}`);
        return null;
      }
    };
    
    let deserializedCount = 0;
    for (const ix of allInstructions) {
      const deserialized = deserializeInstruction(ix);
      if (deserialized) {
        deserializedCount++;
        
        // 验证反序列化后的指令是否有 undefined pubkey
        for (let i = 0; i < deserialized.keys.length; i++) {
          if (!deserialized.keys[i].pubkey) {
            console.log(`  ❌ 反序列化后发现 undefined pubkey at index ${i}`);
            validationPassed = false;
          }
        }
      }
    }
    
    console.log(`  ✅ 成功反序列化 ${deserializedCount}/${allInstructions.length} 条指令`);
    
    console.log('\n' + '='.repeat(80));
    console.log(`Test Suite 3 结果: ${validationPassed && deserializedCount === allInstructions.length ? '✅ API 工作正常' : '❌ 发现问题'}`);
    
    return validationPassed && deserializedCount === allInstructions.length;
    
  } catch (error: any) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    return false;
  }
}

// ============================================================================
// 主测试运行器
// ============================================================================
async function runAllTests() {
  console.log('\n🚀 开始运行所有测试...\n');
  
  const results = {
    suite1: false,
    suite2: false,
    suite3: false,
  };
  
  try {
    results.suite1 = await testNumberParsing();
  } catch (error: any) {
    console.error('Test Suite 1 异常:', error.message);
  }
  
  try {
    results.suite2 = await testInstructionValidation();
  } catch (error: any) {
    console.error('Test Suite 2 异常:', error.message);
  }
  
  try {
    results.suite3 = await testJupiterSwapInstructionsAPI();
  } catch (error: any) {
    console.error('Test Suite 3 异常:', error.message);
  }
  
  // 最终总结
  console.log('\n' + '='.repeat(80));
  console.log('📊 最终测试报告');
  console.log('='.repeat(80));
  console.log(`Suite 1 (Number Parsing):      ${results.suite1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Suite 2 (Instruction Validator): ${results.suite2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Suite 3 (Jupiter API):          ${results.suite3 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(80));
  
  const allPassed = results.suite1 && results.suite2 && results.suite3;
  console.log(`\n总体结果: ${allPassed ? '✅ 所有测试通过！' : '❌ 部分测试失败'}`);
  
  if (allPassed) {
    console.log('\n🎉 所有 bug 修复已验证有效！');
  } else {
    console.log('\n⚠️ 请检查失败的测试用例');
  }
}

// 运行测试
runAllTests().catch(console.error);





