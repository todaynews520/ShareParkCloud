// cloudfunctions/crypto/index.js - 加密解密云函数
const cloud = require('wx-server-sdk');
const crypto = require('crypto');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 加密密钥 - 建议从环境变量获取
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'SHARE_PARK_SECRET_KEY_32_BYTES!!';
const ALGORITHM = 'aes-256-cbc';

/**
 * 加密函数
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8').slice(0, 32), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('加密错误:', err);
    throw err;
  }
}

/**
 * 解密函数
 */
function decrypt(encryptedText) {
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'utf8').slice(0, 32), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('解密错误:', err);
    throw err;
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  const { action, text } = event;

  try {
    if (action === 'encrypt') {
      if (!text) {
        return { success: false, errMsg: '明文不能为空' };
      }
      const encrypted = encrypt(text);
      return { success: true, data: encrypted };
    } else if (action === 'decrypt') {
      if (!text) {
        return { success: false, errMsg: '密文不能为空' };
      }
      const decrypted = decrypt(text);
      return { success: true, data: decrypted };
    } else {
      return { success: false, errMsg: '不支持的操作' };
    }
  } catch (err) {
    console.error('加密/解密失败:', err);
    return {
      success: false,
      errMsg: err.message || '操作失败'
    };
  }
};
