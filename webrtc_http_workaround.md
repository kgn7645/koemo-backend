# WebRTC HTTP Workaround

WebRTCはセキュリティ上の理由から、HTTPSまたはlocalhostでのみ動作します。
HTTPでテストする場合は、以下の方法を使用してください。

## 方法1: Chrome/Edgeを特別なフラグで起動

### Mac:
```bash
# Chromeの場合
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --unsafely-treat-insecure-origin-as-secure="http://192.168.0.8:3000" --user-data-dir=/tmp/chrome-test

# Edgeの場合
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --unsafely-treat-insecure-origin-as-secure="http://192.168.0.8:3000" --user-data-dir=/tmp/edge-test
```

### Windows:
```bash
# Chromeの場合
"C:\Program Files\Google\Chrome\Application\chrome.exe" --unsafely-treat-insecure-origin-as-secure="http://192.168.0.8:3000" --user-data-dir=C:\temp\chrome-test

# Edgeの場合
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --unsafely-treat-insecure-origin-as-secure="http://192.168.0.8:3000" --user-data-dir=C:\temp\edge-test
```

## 方法2: Firefoxの設定変更

1. Firefoxのアドレスバーに `about:config` を入力
2. `media.devices.insecure.enabled` を検索
3. 値を `true` に変更

## 方法3: localhostを使用

サーバーとクライアントの両方でlocalhostを使用：
```
http://localhost:3000/test_matching.html
```

注意: iOSデバイスからはlocalhostにアクセスできないため、実機テストには適していません。

## 推奨される解決策

本番環境に近い形でテストするには、HTTPS証明書を設定することを推奨します：

1. Let's Encryptなどの無料SSL証明書を使用
2. ngrokなどのトンネリングサービスを使用
3. 自己署名証明書を作成して使用

## セキュリティ注意事項

上記のフラグや設定は開発・テスト目的でのみ使用してください。
通常のブラウジングでは使用しないでください。