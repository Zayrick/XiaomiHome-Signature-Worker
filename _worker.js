// 小米IoT平台签名Cloudflare Worker

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
  })
  
  /**
   * 处理HTTP请求
   * @param {Request} request
   */
  async function handleRequest(request) {
    // 只接受POST请求
    if (request.method !== 'POST') {
      return new Response('请使用POST方法', { 
        status: 405,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
      })
    }
  
    try {
      // 解析请求体
      const requestBody = await request.json()
      const { userId, serviceToken, deviceId, securityToken, url, data } = requestBody
  
      if (!securityToken || !url || !data) {
        return new Response('缺少必要参数', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
        })
      }
  
      // 生成签名
      const nonce = generateNonce()
      const signedNonce = await generateSignedNonce(securityToken, nonce)
      const signature = await generateSignature(url, signedNonce, nonce, JSON.stringify(data))
  
      // 返回签名后的参数
      return new Response(JSON.stringify({
        _nonce: nonce,
        data: JSON.stringify(data),
        signature: signature
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
  
    } catch (error) {
      return new Response('处理请求时出错: ' + error.message, { 
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
      })
    }
  }
  
  /**
   * 生成随机数
   */
  function generateNonce() {
    // 生成8字节随机数
    const randomBytes = new Uint8Array(8)
    crypto.getRandomValues(randomBytes)
    
    // 获取当前时间，除以60并转为4字节
    const timeBytes = new Uint8Array(4)
    const time = Math.floor(Date.now() / 1000 / 60)
    timeBytes[0] = (time >> 24) & 0xff
    timeBytes[1] = (time >> 16) & 0xff
    timeBytes[2] = (time >> 8) & 0xff
    timeBytes[3] = time & 0xff
    
    // 合并随机数和时间
    const combined = new Uint8Array(12)
    combined.set(randomBytes)
    combined.set(timeBytes, 8)
    
    // Base64编码
    return btoa(String.fromCharCode.apply(null, combined))
  }
  
  /**
   * 生成签名随机数
   * @param {string} secret Base64编码的密钥
   * @param {string} nonce Base64编码的随机数
   */
  async function generateSignedNonce(secret, nonce) {
    // 解码secret和nonce
    const secretBytes = base64ToUint8Array(secret)
    const nonceBytes = base64ToUint8Array(nonce)
    
    // 合并secret和nonce
    const combined = new Uint8Array(secretBytes.length + nonceBytes.length)
    combined.set(secretBytes)
    combined.set(nonceBytes, secretBytes.length)
    
    // 使用SHA-256哈希
    const hash = await crypto.subtle.digest('SHA-256', combined)
    
    // Base64编码返回
    return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)))
  }
  
  /**
   * 生成签名
   * @param {string} url 接口路径
   * @param {string} signedNonce 签名随机数
   * @param {string} nonce 随机数
   * @param {string} data 数据
   */
  async function generateSignature(url, signedNonce, nonce, data) {
    // 构造签名字符串
    const signString = `${url}&${signedNonce}&${nonce}&data=${data}`
    
    // 解码signedNonce为密钥
    const keyBytes = base64ToUint8Array(signedNonce)
    
    // 创建HMAC密钥
    const key = await crypto.subtle.importKey(
      'raw', 
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-256' } },
      false,
      ['sign']
    )
    
    // 计算HMAC
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signString)
    )
    
    // Base64编码返回
    return btoa(String.fromCharCode.apply(null, new Uint8Array(signature)))
  }
  
  /**
   * Base64字符串转Uint8Array
   * @param {string} base64 Base64编码的字符串
   */
  function base64ToUint8Array(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  } 