# MongoDB Atlas 無料枠セットアップガイド

## 1. MongoDB Atlasアカウント作成

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) にアクセス
2. 無料アカウントを作成（GitHubまたはGoogleアカウントでも可）

## 2. クラスター作成

1. **Create a New Cluster** をクリック
2. **Shared** (無料プラン) を選択
3. クラウドプロバイダーとリージョンを選択：
   - **AWS** を推奨
   - **Tokyo (ap-northeast-1)** を選択（日本から最も近い）
4. クラスター名を設定（例：`koemo-dev`）
5. **Create Cluster** をクリック（作成に数分かかります）

## 3. データベースアクセス設定

1. 左メニューの **Database Access** をクリック
2. **Add New Database User** をクリック
3. ユーザー情報を入力：
   - Authentication Method: **Password**
   - Username: `koemo-dev`
   - Password: 強力なパスワードを生成（保存しておく）
   - Database User Privileges: **Read and write to any database**
4. **Add User** をクリック

## 4. ネットワークアクセス設定

1. 左メニューの **Network Access** をクリック
2. **Add IP Address** をクリック
3. 開発環境用に以下のいずれかを選択：
   - **Allow Access from Anywhere** (0.0.0.0/0) - 開発時のみ推奨
   - または自分のIPアドレスを追加
4. **Confirm** をクリック

## 5. 接続文字列の取得

1. **Database** メニューに戻る
2. クラスターの **Connect** ボタンをクリック
3. **Connect your application** を選択
4. Driver: **Node.js**, Version: **4.1 or later** を選択
5. 接続文字列をコピー：
   ```
   mongodb+srv://<username>:<password>@<cluster-name>.xxxxx.mongodb.net/<database>?retryWrites=true&w=majority
   ```

## 6. 環境変数の設定

`.env` ファイルに以下を追加：

```env
# MongoDB Atlas接続情報
MONGODB_URI=mongodb+srv://koemo-dev:<password>@koemo-dev.xxxxx.mongodb.net/koemo?retryWrites=true&w=majority

# MongoDBを使用するように設定
USE_MONGODB=true
```

**注意事項：**
- `<password>` を実際のパスワードに置き換える
- `<cluster-name>` と `xxxxx` を実際の値に置き換える
- `.env` ファイルは絶対にGitにコミットしない

## 7. 無料枠の制限

MongoDB Atlas無料枠（M0）の制限：
- ストレージ: 512MB
- RAM: 共有
- vCPU: 共有
- 接続数: 最大100
- レプリカセット: 3ノード

開発・テスト用途には十分な容量です。

## 8. 接続テスト

バックエンドサーバーを起動して接続を確認：

```bash
cd backend
npm run dev
```

正常に接続された場合、以下のようなログが表示されます：
```
✅ Connected to MongoDB successfully
✅ Database indexes created successfully
```

## トラブルシューティング

### 接続エラーが発生する場合

1. **IP Whitelist確認**: Network Accessで自分のIPが許可されているか確認
2. **認証情報確認**: ユーザー名とパスワードが正しいか確認
3. **クラスター状態**: Atlas管理画面でクラスターがActiveか確認
4. **ファイアウォール**: 企業ネットワークの場合、27017ポートがブロックされていないか確認

### パフォーマンスが遅い場合

- 無料枠は共有リソースのため、レスポンスが遅い場合があります
- 本番環境では有料プラン（M10以上）への移行を検討してください