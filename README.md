# Note Canvas — Інструкція з налаштування Google OAuth та Firebase

Застосунок **Note Canvas** підтримує автозбереження нотаток на Google Drive, синхронізацію з Google Календарем, а також автономну роботу з локальними `.json` файлами бекапів.

---

## ⚙️ Налаштування Firebase та Google OAuth для нового домену

Якщо застосунок розгортається на власному домені або кастомному сервері (не лише `localhost`), для успішної авторизації через Google необхідно виконати наступні налаштування у Firebase Console та Google Cloud Console.

### 1. Додавання домену в Authorized Domains (Дозволені домени)
За замовчуванням Firebase Auth дозволяє вхід за допомогою `signInWithPopup` лише з `localhost` та доменів AI Studio. Якщо відкрити застосунок з іншого домену, виникне помилка `auth/unauthorized-domain`.

**Кроки для виправлення:**
1. Перейдіть до [Firebase Console](https://console.firebase.google.com/).
2. Оберіть ваш проєкт (вказаний у `firebase-applet-config.json`).
3. Перейдіть у розділ **Build** → **Authentication** → вкладка **Settings**.
4. У блоці **Authorized domains** натисніть **Add domain**.
5. Вкажіть новий домен (наприклад `my-notes-app.com` або домен Cloud Run / Vercel / Netlify).

---

### 2. Перевірка та додавання OAuth Scopes
Для синхронізації з Google Drive та Google Calendar застосунку потрібні дозволи на наступні Scopes:
- `https://www.googleapis.com/auth/drive.file` — створення та редагування бекап-файлів дошки.
- `https://www.googleapis.com/auth/drive.readonly` — читання файлів з Google Drive.
- `https://www.googleapis.com/auth/calendar` — повний доступ до подій Google Календаря.
- `https://www.googleapis.com/auth/calendar.events` — додавання та видалення подій.

**Кроки:**
1. Відкрийте [Google Cloud Console](https://console.cloud.google.com/).
2. Перейдіть у **APIs & Services** → **OAuth consent screen** (Вікно запиту згоди OAuth).
3. Перевірте, щоб у розділі **Scopes** були додані вищезазначені дозволи для Google Drive API та Google Calendar API.

---

### 3. Статус публікації (Publishing Status: Testing vs In Production)
Якщо ваш Google Cloud OAuth consent screen перебуває у статусі **Testing**:
- Вхід через Google працюватиме **тільки для користувачів, доданих вручну** в список **Test Users** у Google Cloud Console (максимум 100 акаунтів).
- Усі інші користувачі бачитимуть помилку доступу `403 Access Blocked: App has not completed the Google verification process`.

**Для публічного використання:**
1. Переведіть проєкт у режим **In production** на сторінці **OAuth consent screen**.
2. Якщо використовуються sensitive/restricted scopes, надайте необхідні дані для верифікації Google.

---

## 💾 Автономний режим (без Google OAuth)

Якщо Google OAuth не налаштовано або домен ще не додано в авторизовані:
- Усі нотатки та вкладення автоматично зберігаються в **IndexedDB / LocalStorage** вашого браузера.
- Ви можете в будь-який момент експортувати дошку в `.json` файл через меню **Експорт/Імпорт** та відновити її на іншому пристрої без авторизації.
