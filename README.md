# 小米IoT平台签名 Cloudflare Worker 使用说明

## 功能说明

这个Cloudflare Worker实现了小米IoT平台的签名功能，可以接收用户输入的相关参数，输出签名后的数据，用于调用小米IoT平台的API。

## 部署方法

1. 登录[Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入Workers & Pages菜单
3. 点击"创建应用程序"
4. 选择"创建Worker"
5. 将`xiaomi-signature-worker.js`的代码复制粘贴到编辑器中
6. 点击"部署"按钮

部署完成后，您将获得一个类似`https://xiaomi-signature-worker.xxx.workers.dev`的URL。

## 使用方法

向Worker发送POST请求，请求体中需要包含以下JSON参数：

```json
{
  "securityToken": "您的securityToken",
  "url": "接口路径，如/miotspec/prop/set",
  "data": {
    "params": [
      {
        "did": "设备ID",
        "siid": 2,
        "piid": 1,
        "value": true
      }
    ]
  }
}
```

### 请求参数说明

| 参数 | 说明 |
|-----|-----|
| securityToken | 您的小米账号安全令牌 |
| url | 小米IoT平台API接口路径 |
| data | 要发送的数据对象 |

### 响应格式

```json
{
  "_nonce": "生成的随机数",
  "data": "JSON字符串化的数据",
  "signature": "生成的签名"
}
```

## 使用示例

### PowerShell示例

```powershell
$uri = "https://xiaomi-signature-worker.xxx.workers.dev"
$body = @{
  securityToken = "Va3gURBh11Fbxn4oBubjnQ=="
  url = "/miotspec/prop/set"
  data = @{
    params = @(
      @{
        did = "1144962922"
        siid = 2
        piid = 1
        value = $true
      }
    )
  }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
$response
```

### 在小米API请求中使用

```powershell
# 1. 获取签名数据
$workerUrl = "https://xiaomi-signature-worker.xxx.workers.dev"
$signRequest = @{
  securityToken = "您的securityToken"
  url = "/miotspec/prop/set"
  data = @{
    params = @(
      @{
        did = "设备ID"
        siid = 2
        piid = 1
        value = $true
      }
    )
  }
} | ConvertTo-Json

$signData = Invoke-RestMethod -Uri $workerUrl -Method Post -Body $signRequest -ContentType "application/json"

# 2. 使用签名数据调用小米API
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$session.Cookies.Add((New-Object System.Net.Cookie("serviceToken", "您的serviceToken", "/", "api.io.mi.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("userId", "您的userId", "/", "api.io.mi.com")))
$session.Cookies.Add((New-Object System.Net.Cookie("PassportDeviceId", "您的deviceId", "/", "api.io.mi.com")))

$headers = @{
  'User-Agent' = 'APP/com.xiaomi.mihome APPV/6.0.103 iosPassportSDK/3.9.0 iOS/14.4 miHSTS'
  'x-xiaomi-protocal-flag-cli' = 'PROTOCAL-HTTP2'
}

$requestParams = @{
  _nonce = $signData._nonce
  data = $signData.data
  signature = $signData.signature
}

$response = Invoke-RestMethod -Uri "https://api.io.mi.com/app/miotspec/prop/set" -Method Post -WebSession $session -Headers $headers -Body $requestParams
$response
```

## 安全提示

请妥善保管您的securityToken、serviceToken等敏感信息，不要泄露给他人。建议在自己的Cloudflare账号下部署Worker，避免将敏感信息发送到他人控制的服务器。 