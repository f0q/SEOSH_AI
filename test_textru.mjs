import { config } from "dotenv";
config();

const apiKey = process.env.TEXTRU_API_KEY;

async function run() {
  const text = "Это тестовый текст для проверки работы API сервиса Text.ru на уникальность, воду и заспамленность. Это предложение добавлено, чтобы длина текста превышала сто символов, необходимых для корректной работы сервиса антиплагиата.";
  console.log("Submitting...");
  
  try {
    const submitRes = await fetch("https://api.text.ru/post", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, userkey: apiKey || "" }),
    });
    
    const submitData = await submitRes.json();
    console.log("Submit Response:", submitData);
    
    if (submitData.text_uid) {
      console.log(`Polling UID ${submitData.text_uid}...`);
      while (true) {
        const checkRes = await fetch("https://api.text.ru/post", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ uid: submitData.text_uid, userkey: apiKey || "", jsonvisible: "detail" }),
        });
        const json = await checkRes.json();
        console.log("Poll Response:", json);
        if (json.error_code !== 181) break;
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
