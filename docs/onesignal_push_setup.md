# OneSignal Web Push: Client -> Server Setup (Rebuild Guide)

This guide documents the end-to-end flow to set up OneSignal Web Push for this project, from client registration to server send.

## 1) Prereqs

- OneSignal App ID (public)
- OneSignal App REST API Key (secret, server only)
- HTTPS for local dev (self-signed is ok)

## 2) Client setup

### 2.1 Load the OneSignal Web SDK

Add the OneSignal v16 SDK loader to [client/src/index.html](client/src/index.html):

```html
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
</script>
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
```

### 2.2 Service worker at app root

Create [client/src/OneSignalSDKWorker.js](client/src/OneSignalSDKWorker.js):

```js
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
```

Ensure the worker is copied to the app root via [client/angular.json](client/angular.json):

```json
"assets": [
  "src/assets",
  "public/favicon.ico",
  {
    "glob": "OneSignalSDKWorker.js",
    "input": "src",
    "output": "/"
  }
]
```

### 2.3 Initialize OneSignal and link user

In [client/src/app/app.ts](client/src/app/app.ts), inside `ngOnInit()` and `isPlatformBrowser()`:

```ts
windowAny.OneSignalDeferred = windowAny.OneSignalDeferred || [];
windowAny.OneSignalDeferred.push(async (OneSignal: any) => {
  await OneSignal.init({
    appId: "<YOUR_ONESIGNAL_APP_ID>",
    allowLocalhostAsSecureOrigin: true,
    serviceWorkerPath: "OneSignalSDKWorker.js",
  });

  const currentUser = this.authService.getUserInfor();
  if (currentUser && currentUser.id) {
    if (OneSignal.login && typeof OneSignal.login === "function") {
      await OneSignal.login(String(currentUser.id));
    }
  }
});
```

This attaches your DB user ID as OneSignal `external_user_id`. The server sends to this ID later.

## 3) Server setup

### 3.1 Environment variables

Add to `server/.env` (never commit secrets):

```env
ONESIGNAL_APP_ID=<YOUR_ONESIGNAL_APP_ID>
ONESIGNAL_REST_API_KEY=<YOUR_REST_API_KEY>
```

### 3.2 OneSignal service

Create [server/src/services/oneSignalService.js](server/src/services/oneSignalService.js) and send with the REST API:

- URL: `https://api.onesignal.com/notifications`
- Header: `Authorization: key YOUR_REST_API_KEY`
- Body: include `include_external_user_ids`

### 3.3 Message flow integration

In your message service (example: [server/src/services/homeMessagesServices.js](server/src/services/homeMessagesServices.js)):

- After message is saved, collect conversation participants
- Filter out the sender
- Call OneSignal service to notify recipients

This should be non-blocking (do not delay message creation if OneSignal fails).

## 4) Important notes

- The device must be subscribed and have `external_user_id` set.
- In OneSignal dashboard, check User Records for `external_user_id`.
- If you see "All included players are not subscribed", the target user is not linked.

## 5) Quick verification

1) Open app in two browsers
2) Ensure both users show `external_user_id` in OneSignal dashboard
3) Send a message
4) Recipient receives notification

## 6) Common issues

- 403 Access denied: wrong REST API key or wrong auth header format
- No notification: user not subscribed or external user id not set
- Service worker not found: confirm [client/src/OneSignalSDKWorker.js](client/src/OneSignalSDKWorker.js) is served at `/OneSignalSDKWorker.js`

## 7) Optional: payload content

If your message content is ciphertext, send a generic body:

- Title: sender name
- Content: "You have a new message"

---

