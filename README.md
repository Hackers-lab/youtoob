# YouToob Music — Alexa Skill (Vercel & AWS Compatible)

A high-performance Alexa Skill that streams audio from YouTube / YouTube Music to your Amazon Echo devices, deployable directly to **Vercel** or **AWS / Alexa-Hosted Skills**.

---

## ⚡ Quick Start: Deploy to Vercel

### Option A: Via Vercel CLI
Run the following in this folder:
```bash
npx vercel login
npx vercel --prod
```
Follow the prompts. Once deployed, copy your production URL:
> `https://<your-project>.vercel.app/api/alexa`

### Option B: Via GitHub & Vercel Dashboard
1. Push this folder to your GitHub repository:
   ```bash
   git add .
   git commit -m "Deploy YouToob Music skill"
   git push -u origin main
   ```
2. In the [Vercel Dashboard](https://vercel.com/new), select **Import** on your repo and click **Deploy**.
3. Your Alexa endpoint will be: `https://<your-project>.vercel.app/api/alexa`.

> **Note on Environment Variables**: **No environment variables are needed** on Vercel! The engine uses zero-key search and stream resolution out of the box.

---

## 🎙️ Connecting to Alexa (2-Minute Setup)

1. Open the [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask) and sign in with your Amazon account.
2. Click **Create Skill**:
   - **Skill name**: `YouToob Music`
   - **Primary locale**: English (US) (or your preferred English locale)
   - **Model**: Custom
   - **Hosting**: Provision your own (since you are hosting on Vercel)
3. **Enable AudioPlayer Interface**:
   - Go to **Interfaces** in the left sidebar.
   - Toggle **Audio Player** to **ON**.
   - Click **Save Interfaces**.
4. **Configure Interaction Model**:
   - Go to **Interaction Model** -> **JSON Editor** in the left sidebar.
   - Paste the contents of `skill-package/interactionModels/custom/en-US.json`.
   - Click **Save Model** and then **Build Model**.
5. **Set the Endpoint**:
   - Go to **Endpoint** in the left sidebar.
   - Select **HTTPS**.
   - Under **Default Region**, paste your Vercel URL:
     `https://<your-project>.vercel.app/api/alexa`
   - Under **SSL Certificate type**, select:
     > *"My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"*
   - Click **Save Endpoints**.

---

## 🗣️ Voice Invocations on Your Echo

The invocation name is configured as **`youtoob music`** (pronounced identically to "YouTube Music"):

- *"Alexa, ask YouToob Music to play Starboy"*
- *"Alexa, ask YouToob Music to play Shape of You by Ed Sheeran"*
- *"Alexa, open YouToob Music and play Believer"*
- *"Alexa, pause"*
- *"Alexa, resume"*

### Pro-Tip: Alexa Routine Shortcut
To trigger music with shorter commands without saying the full invocation:
1. Open the **Amazon Alexa App** on your phone.
2. Go to **More** -> **Routines** -> **+**.
3. **When you say**: *"Alexa, my tunes"* or *"Alexa, play music"*.
4. **Action**: Select **Custom** -> type: *"Ask YouToob Music to play latest hits"*.
5. Save the routine!
