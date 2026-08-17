# Сад випадкових думок

Невеликий інтерактивний веб-арт: кожна коротка фраза виростає в унікальну світну рослину.

**[Відкрити живий сад](https://thought-garden.rozum-komunalka.workers.dev)**

## Запуск

Встановіть залежності та запустіть локальний сервер:

```powershell
npm install
npm run dev
```

Wrangler покаже локальну адресу після запуску.

## Публікація

```powershell
npm run deploy
```

Сайт публікується через [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

## Що всередині

- генеративні рослини на Canvas без бібліотек;
- чотири настрої-кольори;
- локальне збереження у `localStorage`;
- делікатний синтезований звук після явного ввімкнення;
- адаптивний інтерфейс і підтримка `prefers-reduced-motion`.

Жодні думки не залишають ваш браузер.

## Ліцензія

[MIT](LICENSE)
