/**
 * 加密工具类
 * 用于敏感数据加密（如车牌号）
 */

// 加密密钥 - 实际使用时应该从云函数获取或使用更安全的方式
const SECRET_KEY = 'SHARE_PARK_SECRET_2024';
const IV_LENGTH = 16;

/**
 * Base64 编码
 */
function base64Encode(str) {
  return wx.arrayBufferToBase64(
    new TextEncoder().encode(str).buffer
  );
}

/**
 * Base64 解码
 */
function base64Decode(base64) {
  const binaryString = wx.base64ToArrayBuffer(base64);
  return new TextDecoder().decode(new Uint8Array(binaryString));
}

/**
 * 简单 XOR 加密（小程序端）
 * 注意：实际加密应该在云函数端进行
 */
function simpleXOREncrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return base64Encode(result);
}

/**
 * 简单 XOR 解密（小程序端）
 */
function simpleXORDecrypt(encryptedText, key) {
  const decoded = base64Decode(encryptedText);
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(
      decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * 车牌号脱敏显示
 * @param {string} plateNumber - 完整车牌号
 * @param {boolean} showAll - 是否显示全部（默认false，隐藏中间部分）
 * @returns {string} 脱敏后的车牌号
 */
function maskPlateNumber(plateNumber, showAll = false) {
  if (!plateNumber) return '';

  if (showAll) return plateNumber;

  // 保留前2位和后2位，中间用*代替
  if (plateNumber.length <= 4) {
    return plateNumber.substring(0, 1) + '**' + plateNumber.substring(plateNumber.length - 1);
  }

  return plateNumber.substring(0, 2) + '***' + plateNumber.substring(plateNumber.length - 2);
}

/**
 * 调用云函数进行加密
 * @param {string} plainText - 明文
 * @returns {Promise<string>} 密文
 */
async function encryptData(plainText) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'crypto',
      data: {
        action: 'encrypt',
        text: plainText
      }
    });
    return res.result.data;
  } catch (err) {
    console.error('加密失败:', err);
    return plainText; // 失败时返回原文
  }
}

/**
 * 调用云函数进行解密
 * @param {string} encryptedText - 密文
 * @returns {Promise<string>} 明文
 */
async function decryptData(encryptedText) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'crypto',
      data: {
        action: 'decrypt',
        text: encryptedText
      }
    });
    return res.result.data;
  } catch (err) {
    console.error('解密失败:', err);
    return encryptedText; // 失败时返回密文
  }
}

module.exports = {
  simpleXOREncrypt,
  simpleXORDecrypt,
  maskPlateNumber,
  encryptData,
  decryptData
};
