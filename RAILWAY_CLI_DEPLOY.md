# Railway CLI デプロイ手順

## 手順

1. **ターミナルでRailway CLIでログイン**
   ```bash
   railway login
   ```
   - ブラウザが自動で開きます
   - Railwayアカウントでログインを許可

2. **プロジェクトとリンク**
   ```bash
   # backendディレクトリにいることを確認
   cd /Users/sou/Documents/AI_Driven_Dev/KOEMO/backend
   
   # 既存のプロジェクトとリンク
   railway link
   ```
   - koemo-backend プロジェクトを選択

3. **環境変数を設定**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set USE_MONGODB=false
   railway variables set PORT=3000
   railway variables set JWT_SECRET=koemo-production-secret-2024
   railway variables set CORS_ORIGIN=*
   ```

4. **デプロイ実行**
   ```bash
   railway up
   ```

5. **ドメイン確認**
   ```bash
   railway status
   ```
   - デプロイされたURLが表示されます

## まず試すこと

1. 現在の画面（データベース選択）を閉じる
2. 右上の「**Create**」ボタンをクリック
3. そこに他のオプションがあるか確認

それでもダメなら上記のCLI手順を実行してください。