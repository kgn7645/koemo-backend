# 無料TURNサーバーオプション

## 1. 無料TURNサービス

### Open Relay Project (推奨)
```javascript
// WebRTCService.swift で使用
const stunServers = [
  "stun:openrelay.metered.ca:80",
  "stun:stun.l.google.com:19302"
];

const turnServers = [
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject", 
    credential: "openrelayproject"
  }
];
```

### Xirsys (無料枠)
```bash
# 無料枠
- 月50MB転送量
- 小規模テスト用
- 登録必要: https://xirsys.com
```

### Twilio STUN/TURN (無料トライアル)
```bash
# 無料トライアル
- $15クレジット
- 高品質
- 本番環境準備に最適
```

## 2. 自前TURNサーバー (上級者向け)

### Google Cloud Platform 無料枠
```bash
# GCP Always Free
- f1-micro インスタンス (1vCPU, 0.6GB RAM)
- coturn インストール
- 月額無料 (制限内)
```

### DigitalOcean ($200クレジット)
```bash
# 学生なら$200クレジット
- 最小$4/月 droplet
- 4ヶ月無料使用可能
- coturn セットアップ
```

## 3. WebRTCService.swift の更新

```swift
struct WebRTCConfig {
    static let stunServers = [
        "stun:openrelay.metered.ca:80",
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
    ]
    
    static let turnServers = [
        RTCIceServer(
            urlStrings: ["turn:openrelay.metered.ca:80"],
            username: "openrelayproject",
            credential: "openrelayproject"
        ),
        RTCIceServer(
            urlStrings: ["turn:openrelay.metered.ca:443"],
            username: "openrelayproject",
            credential: "openrelayproject"
        )
    ]
}

// setupPeerConnection() 内で使用
let config = RTCConfiguration()
config.iceServers = [
    RTCIceServer(urlStrings: WebRTCConfig.stunServers)
] + WebRTCConfig.turnServers
```

## 4. 接続成功率の向上

### 無料構成での期待値
```
- STUN のみ: 70-80% 成功率
- STUN + TURN: 90-95% 成功率
- 商用サービス: 98-99% 成功率
```

### トラブルシューティング
```javascript
// デバッグ用: ICE candidate 確認
pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('ICE Type:', event.candidate.type);
    // host: 直接接続
    // srflx: STUN経由  
    // relay: TURN経由
  }
};
```

## 5. 費用最小化のポイント

### 開発段階
- Railway: 無料
- Open Relay TURN: 無料
- Google STUN: 無料

### MVP段階  
- Railway Pro: $20/月
- Xirsys TURN: $0-10/月
- 合計: $20-30/月

### スケール段階
- 専用サーバー: $50-100/月
- または商用WebRTCサービス: $0.01-0.05/分