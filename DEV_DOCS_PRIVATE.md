HEAD
## How Koda (and other AIs) fetch the shared Knowledge Base   

# Koda – Private Developer Notes

## 1. Fetching the shared Knowledge Base

JavaScript helper (copy into any new AI front-end):
 1ad536a (docs: add private knowledge instructions)

```javascript
async function loadKodaKnowledge() {
  const url =
  HEAD
    "[https://firestore.googleapis.com/v1/projects/voices-d80ae](https://firestore.googleapis.com/v1/projects/voices-d80ae)" +

    "https://firestore.googleapis.com/v1/projects/voices-d80ae" +
 1ad536a (docs: add private knowledge instructions)
    "/databases/(default)/documents/knowledge?pageSize=1000";

  const res  = await fetch(url);
  const json = await res.json();
  return (json.documents || []).map(d => {
    const f = d.fields;
    return {
      title:   f.title.stringValue,
      content: f.content.stringValue,
      link:    f.link?.stringValue || ""
    };
  });
}
 HEAD

```

Use once on startup:
```js
let knowledgeBase = [];
loadKodaKnowledge().then(items => knowledgeBase = items);
```

---

## 2. Weekly GitHub backup
*Workflow file:* `.github/workflows/knowledge-backup.yml`
Runs every Monday, exports `knowledge.json` via Firestore REST and commits it.

---

## 3. Global chat-pair logging (admin only)
Collection: `all_chats`
Inserted inside `simulateResponse()` in `script.js` when `isAdmin()`.

Firestore rule:
```rules
match /all_chats/{docId} {
  allow read, write: if request.auth.token.email == "codedwaves01@gmail.com";
}
```

Export example:
```bash
curl -o all_chats.json \
  "https://firestore.googleapis.com/v1/projects/voices-d80ae/databases/(default)/documents/all_chats?pageSize=1000"
```

---

## 4. Prompts – injecting knowledge

Use Koda’s pattern:
```js
if (knowledgeBase.length) {
  const kbText = knowledgeBase.map(k =>
    `--- KNOWLEDGE ITEM: ${k.title} ---\n${k.content}`
  ).join('\n\n');
  systemPrompt += `\n\n### EXTRA KNOWLEDGE ###\n${kbText}\n### END ###`;
}
```

---

*Keep this file unlinked; only people who know the exact name can open it.*
 1ad536a (docs: add private knowledge instructions)
