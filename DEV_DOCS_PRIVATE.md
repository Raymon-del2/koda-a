# Koda – Private Developer Notes

## 1. Fetching the shared Knowledge Base

Paste this helper into any AI’s main JS file:

```javascript
async function loadKodaKnowledge() {
  const url =
    "[https://firestore.googleapis.com/v1/projects/voices-d80ae](https://firestore.googleapis.com/v1/projects/voices-d80ae)" +
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

// run once when the page opens
let knowledgeBase = [];
loadKodaKnowledge().then(items => (knowledgeBase = items));