const supabase = window.supabase.createClient(
  "https://eeqvavgbcltkfsbjglbg.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcXZhdmdiY2x0a2ZzYmpnbGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NzYwMTEsImV4cCI6MjA5MjU1MjAxMX0.Watu0z57i8UwqzHVrOJh4pZaxisFT0T8XgkNPboYoWI"
);

let user = "";

// LOGIN
function login(name) {
  user = name;

  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "block";

  document.getElementById("username").innerText = name;

  loadMessages();
  loadProfile();

  Notification.requestPermission();
}

// FOTO DE PERFIL
document.getElementById("avatarInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileName = `${user}.png`;

  await supabase.storage.from("avatars").upload(fileName, file, {
    upsert: true
  });

  const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);

  await supabase.from("profiles").update({
    avatar_url: data.publicUrl
  }).eq("name", user);

  document.getElementById("avatarPreview").src = data.publicUrl;
});

// CARREGAR PERFIL
async function loadProfile() {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("name", user)
    .single();

  if (data?.avatar_url) {
    document.getElementById("avatarPreview").src = data.avatar_url;
  }
}

// ENVIAR TEXTO
async function sendMessage() {
  const text = document.getElementById("text").value;
  if (!text) return;

  await supabase.from("messages").insert([{
    username: user,
    content: text,
    type: "text"
  }]);

  document.getElementById("text").value = "";
}

// FOTO
async function sendPhoto() {
  const file = document.getElementById("photoInput").files[0];
  if (!file) return;

  const fileName = `${user}-${Date.now()}.png`;

  await supabase.storage.from("messages").upload(fileName, file);

  const { data } = supabase.storage.from("messages").getPublicUrl(fileName);

  await supabase.from("messages").insert([{
    username: user,
    type: "image",
    file_url: data.publicUrl
  }]);
}

// ÁUDIO
let recorder;
let chunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  recorder = new MediaRecorder(stream);
  recorder.start();

  chunks = [];

  recorder.ondataavailable = e => chunks.push(e.data);

  recorder.onstop = async () => {
    const blob = new Blob(chunks);

    const fileName = `${user}-${Date.now()}.webm`;

    await supabase.storage.from("messages").upload(fileName, blob);

    const { data } = supabase.storage.from("messages").getPublicUrl(fileName);

    await supabase.from("messages").insert([{
      username: user,
      type: "audio",
      file_url: data.publicUrl
    }]);
  };

  setTimeout(() => recorder.stop(), 3000);
}

// CARREGAR MENSAGENS
async function loadMessages() {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .order("created_at");

  render(data);
}

// RENDER
function render(messages) {
  const container = document.getElementById("messages");
  container.innerHTML = "";

  messages.forEach(msg => {
    const div = document.createElement("div");

    if (msg.type === "text") {
      div.innerText = msg.username + ": " + msg.content;
    }

    if (msg.type === "image") {
      const img = document.createElement("img");
      img.src = msg.file_url;
      img.width = 150;
      div.appendChild(img);
    }

    if (msg.type === "audio") {
      const audio = document.createElement("audio");
      audio.src = msg.file_url;
      audio.controls = true;
      div.appendChild(audio);
    }

    container.appendChild(div);
  });
}

// TEMPO REAL + NOTIFICAÇÃO
supabase
  .channel('chat')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, payload => {

    loadMessages();

    if (Notification.permission === "granted") {
      new Notification("Nova mensagem 💖", {
        body: payload.new.username + " enviou algo!"
      });
    }

  })
  .subscribe();

// SERVICE WORKER
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
