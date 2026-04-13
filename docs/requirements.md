# 要件定義書：MyCloset アーキテクチャ変更

**作成日:** 2026-04-06  
**バージョン:** 1.0

---

## 1. 変更の背景と目的

現行システムでは、コーデ作成のたびにGemini APIを呼び出して「複数の服を着たマネキン画像」を生成している。
これを変更し、**AI画像生成は服の登録時のみ**に限定する。
服登録時に透過PNG（服のみ）を生成しておき、コーデ作成時はそれらをキャンバスでレイヤー合成するだけにする。

**目的:**
- コーデ作成を高速化（AI待ち時間をゼロに）
- API呼び出しコストを削減
- 合成結果を確定的にする（AIの出力ゆれをなくす）

---

## 2. システム概要

| 項目 | 現行 | 新仕様 |
|------|------|--------|
| AI生成タイミング | コーデ作成時 | **服登録時のみ** |
| 生成内容 | 複数の服を着たマネキン全身画像 | マネキンに1着だけ着せた画像 → 背景・マネキン透過 |
| コーデ合成方法 | AI生成 | 透過PNGをキャンバスでレイヤー合成（AI不使用） |
| 保存形式 | JPEG Blob | 透過PNG Blob（服のみ） |

---

## 3. 服登録フロー（変更）

### 3-1. ユーザー操作
1. 服の写真をアップロード
2. 名前・カテゴリを入力
3. 「登録」ボタンを押す

### 3-2. システム処理（自動）

```
Step 1: Gemini API で「マネキンに1着着せた白背景画像」を生成
        ↓
Step 2: remove.bg API で服以外（背景・マネキン）を透過させる
        ↓
Step 3: 透過PNG（服のみ）をIndexedDBに保存
        ↓
Step 4: クローゼットに自動登録、完了通知
```

### 3-3. Gemini プロンプト

```
"Generate a high quality fashion photo of a [gender] fashion mannequin wearing only [item_name] ([category]).
White pure background. Do not show any other garments. Full body from neck to ankle."
```

### 3-4. 背景除去

- **使用API:** remove.bg API
- **環境変数:** `REMOVEBG_API_KEY`（`.env.local` に追加）
- Gemini生成画像（白背景）をそのままAPIに渡す
- 返却: 透過PNG (image/png with alpha channel)

---

## 4. コーデ作成フロー（変更）

### 4-1. ユーザー操作
1. クローゼットから服（透過PNG）を1枚以上選択
2. リアルタイムプレビューでマネキン + 服のレイヤー合成を確認
3. コーデ名を入力して保存

### 4-2. レイヤー合成順序（Z軸、下から）

```
Layer 0: マネキン基底画像（public/mannequin-female.png または mannequin-male.png）
Layer 1: ボトムス (bottom)
Layer 2: トップス (top)
Layer 3: アウター (outer)
Layer 4: アクセサリー (accessory)
```

### 4-3. キャンバス合成処理
- `useCanvas.ts` を拡張してレイヤー合成に対応
- マネキン画像を Layer 0 として描画
- 各服の透過PNGを `drawImage()` で順に重ねる
- AI生成なし → 高速・即時プレビュー

---

## 5. データモデル変更

### 5-1. ClothingItem 型

```typescript
interface ClothingItem {
  id: string;
  name: string;
  category: 'top' | 'bottom' | 'outer' | 'accessory' | 'coordinate';
  createdAt: string;
  usedItemIds?: string[];
  // 追加フィールド
  hasTransparentImage: boolean;
  transparentImageStatus: 'pending' | 'processing' | 'done' | 'failed';
}
```

### 5-2. ImageRecord

```typescript
interface ImageRecord {
  thumbnail: Blob;      // 300px, PNG
  full: Blob;           // 800px, PNG
  original?: Blob;      // アップロード元画像
  transparent?: Blob;   // 透過PNG（服のみ）★新規追加
}
```

### 5-3. IndexedDB スキーマ
- `mycloset-db` v1 → **v2** へマイグレーション
- `images` ストアに `transparent` キーを追加
- 既存データは `transparentImageStatus: 'pending'` で移行

### 5-4. カテゴリ定義（更新後）

```typescript
type ClothingCategory = 'top' | 'bottom' | 'outer' | 'accessory' | 'coordinate';
```

---

## 6. API エンドポイント変更

### 廃止
- `POST /api/generate-outfit` — コーデAI生成エンドポイント（削除）

### 新設
- `POST /api/generate-clothing-transparent`
  - **Input:** `{ imageBase64, mimeType, itemName, category, gender }`
  - **Step 1:** Gemini で白背景マネキン着用画像を生成
  - **Step 2:** remove.bg API で背景・マネキンを透過
  - **Output:** `{ transparentImageBase64, mimeType: 'image/png' }`

---

## 7. UI/UX 変更

### 7-1. 服登録ページ (`/register`)
- 登録フォーム自体は変更なし
- カテゴリ選択に **アウター / アクセサリー** を追加
- 「登録」後、処理中インジケーター表示（「透過画像を生成中…」）
- 完了後: 生成された透過PNG のプレビューを表示
- エラー時: 元画像でフォールバック保存

### 7-2. コーデページ (`/coordinate`) — 全面書き直し
- AIコーデ生成UI（Single Mode / Multi Mode）を**削除**
- 新UI構成:
  - 上部: 女性/男性マネキン切り替えボタン
  - 左/上側: クローゼットから服を選択（透過PNGサムネイル表示）
  - 右/下側: キャンバスプレビュー（マネキン + 選択した服のレイヤー合成）
  - 下部: コーデ名入力 + 保存ボタン

### 7-3. クローゼットページ (`/closet`)
- 服のサムネイルを透過PNGで表示（背景なし）
- `transparentImageStatus: 'pending'` の場合は「処理待ち」バッジ表示

### 7-4. 生成済みコーデページ (`/generated`) — **削除**
- 旧AIコーデ一覧ページを完全削除
- ナビゲーションからも除去

---

## 8. マネキン基底画像

| ファイル | 内容 |
|---------|------|
| `public/mannequin-female.png` | 女性マネキン、透過背景、全身（首〜足首）、腕を自然に下ろした立ち姿 |
| `public/mannequin-male.png` | 男性マネキン、同上 |

---

## 9. 変更不要な箇所

- `src/components/Navigation.tsx`（リンク先変更のみ）
- `src/components/ClothingCard.tsx`（基本構造維持）
- `src/hooks/useCloset.ts`（add/remove/rename ロジック維持）
- `src/lib/imageDb.ts`（スキーマ追加のみ）

---

## 10. 削除対象

| 対象 | 理由 |
|------|------|
| `src/app/api/generate-outfit/route.ts` | コーデAI生成APIは廃止 |
| `src/app/generated/` ディレクトリ | 生成済みコーデ一覧ページを廃止 |
| `src/lib/constants.ts` のAI/プロンプト関連定数 | 不要となる |

---

## 11. 移行・後方互換性

- 既存の ClothingItem データは維持（削除しない）
- 既存アイテムは `hasTransparentImage: false`, `transparentImageStatus: 'pending'` で移行
- 旧コーデ（`category: 'coordinate'`）はそのまま表示継続
- IndexedDB v1 → v2 マイグレーション: 既存レコードに `transparent: undefined` を追加

---

## 12. 検証方法

1. **服登録**: 画像アップロード → 登録 → 透過PNG生成 → クローゼットに表示（服のみ、背景なし）
2. **コーデ作成**: クローゼットから服選択 → キャンバスプレビューでマネキンに重なって表示 → 保存
3. **既存データ**: 旧登録データがクローゼットに引き続き表示されること
4. **エラーハンドリング**: 背景除去失敗時に元画像でフォールバック保存されること
5. **AI不使用確認**: コーデ作成画面でGemini API呼び出しが発生しないこと

---

## 13. 環境変数（追加）

```
# .env.local に追加
REMOVEBG_API_KEY=your_api_key_here
```

既存: `GEMINI_API_KEY`（服登録時に引き続き使用）
