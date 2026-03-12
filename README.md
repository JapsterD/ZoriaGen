# ZoriaGen

AI-генератор видео из изображений и текстовых промптов. Использует Replicate API и модели Minimax / Wan для создания видео.

## Структура проекта

- **zoria-gen/** — основной веб-приложение (Next.js 16)
- **migration/** — инструмент миграции (Solana ↔ BSC)
- **web/** — статический лендинг

## Быстрый старт

### 1. Установка

```bash
cd zoria-gen
npm install
```

### 2. Настройка

Скопируйте `.env.example` в `.env.local` и заполните:

```bash
cp .env.example .env.local
```

Необходимые переменные:
- `REPLICATE_API_TOKEN` — токен с [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
- `NEXT_PUBLIC_PRIVY_APP_ID` — для авторизации (Privy)

### 3. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Как пользоваться

1. Загрузите изображение персонажа (PNG/JPEG, до 5MB)
2. Напишите промпт действия или нажмите «AI Suggest»
3. Нажмите «Create Video» — каждое видео стоит 10 кредитов
4. Галерея — просмотр и скачивание ваших видео

## Стек

- Next.js 16 (App Router)
- Tailwind CSS v4
- Replicate API
- Privy (аутентификация)
- JSON-хранилище (без БД)

Подробности — в [zoria-gen/README.md](zoria-gen/README.md).
