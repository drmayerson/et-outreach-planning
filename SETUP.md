# Connecting the Google Sheet

Without this setup the app runs in **demo mode**: everything works, but data stays in your own browser.
These steps connect it to a shared Google Sheet so you can work together. You only do this once (about 20 minutes).

You need: your Google account, and your colleague's Google e-mail address.

## 1. Create the Sheet and the script

1. In Google Drive, create a new Google Sheet, e.g. **Planningstool – data**.
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the example code and paste the full contents of [`apps-script/Code.gs`](apps-script/Code.gs). Save (Ctrl+S).

## 2. Create a Google login ("OAuth client ID")

1. Go to <https://console.cloud.google.com/> and create a new project, e.g. **Planningstool**.
2. Open **Google Auth Platform** (search for "OAuth consent screen" if you don't see it) and click **Get started**:
   - App name: *Planningstool*, support e-mail: your address.
   - Audience: **External**.
   - Contact e-mail: your address. Accept and create.
3. Under **Audience → Test users**, add your own Google address and your colleague's.
4. Under **Clients → Create client**:
   - Application type: **Web application**, name: *Planningstool*.
   - **Authorized JavaScript origins**: add `https://drmayerson.github.io` (and, for testing on your own computer, `http://localhost:8080`).
   - Leave "Authorized redirect URIs" empty. Create.
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`). It is not a secret.

## 3. Configure and deploy the script

1. Back in Apps Script: **Project Settings** (gear icon) → **Script properties → Add script property**:
   `CLIENT_ID` = the Client ID from step 2.
2. In the editor, check that the function dropdown in the toolbar (next to **Debug**) says **setup**, then click **Run**.
   Google asks for permission the first time: choose your account, then **Advanced → Go to … (unsafe)** → **Allow**
   (the warning appears because the script is your own and not verified by Google).
   The **Execution log** at the bottom should end with "Tabbladen klaar". The Sheet now has the tabs
   `users`, `categories`, `lists`, `projects` and `todos`, with you on the `users` tab.
   If the log says the script is not attached to a Sheet, you created it at script.google.com: start again from
   the Sheet via **Extensions → Apps Script**.
3. In the Sheet, tab **users**: add a row for your colleague (e-mail in column A, name in column B). Fix your own name in column B too.
4. In Apps Script: **Deploy → New deployment** → type **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy, then copy the **Web app URL** (ends in `/exec`).

"Anyone" only means the address can be reached; the script itself only accepts people on the `users` tab who are signed in with Google.

## 4. Point the app at the Sheet

Fill in both values in [`js/config.js`](js/config.js), then commit and push:

```js
export const CONFIG = {
  clientId: '…apps.googleusercontent.com',
  apiUrl: 'https://script.google.com/macros/s/…/exec',
};
```

Open the app, sign in with Google, done.

## Later changes to the script

After changing `Code.gs`: **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**.
The URL stays the same.

## Good to know

- The Sheet is the database. You can read it, but avoid editing the tabs by hand while the app is open; edit names in the `users` tab freely.
- Removing someone's access: delete their row on the `users` tab.
- The data is in your Google account. Check KU Leuven's rules before storing contact details of external people (question 58).
