import { db } from "./firebase.js";
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, orderBy, query, serverTimestamp, onSnapshot
} from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_KEY;
const ai = new GoogleGenerativeAI(GEMINI_API_KEY);

const INTENSITY = {
  순한맛: { emoji: "🌱", prompt: "따뜻한 명언이나 위로의 말로 답해줘. 유명한 철학자나 작가의 명언을 인용해도 좋아. 반말로 친근하게." },
  중간: { emoji: "🌶", prompt: "솔직하게 팩폭해줘. 명언이나 날카로운 한마디로 현실을 직시하게 해줘. 반말로, 유머도 약간 섞어도 돼." },
  핵팩폭: { emoji: "💣", prompt: "거침없이 핵팩폭해줘. 돌려말하지 말고 반말로 직설적으로, 뼈 때리는 한마디로 현실을 직면하게 해줘." },
};

let selectedIntensity = "중간";

// 글자수 카운터
document.getElementById("story").addEventListener("input", (e) => {
  document.getElementById("story-count").textContent = e.target.value.length;
});

// 강도 버튼
document.querySelectorAll(".intensity-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".intensity-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedIntensity = btn.dataset.intensity;
  });
});

// 사연 올리기 버튼
document.getElementById("open-form-btn").addEventListener("click", () => {
  document.getElementById("open-form-btn").classList.add("hidden");
  document.getElementById("post-form").classList.remove("hidden");
});
document.getElementById("cancel-btn").addEventListener("click", () => {
  document.getElementById("post-form").classList.add("hidden");
  document.getElementById("open-form-btn").classList.remove("hidden");
});

// 글 제출
document.getElementById("submit-btn").addEventListener("click", async () => {
  const story = document.getElementById("story").value.trim();
  const pw = document.getElementById("pw").value.trim();
  if (!story) return alert("사연을 입력해주세요!");

  document.getElementById("submit-btn").textContent = "AI 팩폭 생성 중...";
  document.getElementById("submit-btn").disabled = true;

  try {
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(
      `너는 사연을 듣고 짧고 임팩트 있게 답해주는 존재야. ${INTENSITY[selectedIntensity].prompt} 답변은 3~5문장 이내로, 간결하고 강렬하게.\n\n사연: ${story}`
    );
    const aiReply = result.response.text() || "답변을 불러오지 못했어요.";

    await addDoc(collection(db, "posts"), {
      story,
      intensity: selectedIntensity,
      aiReply,
      pw: pw || null,
      reactions: { "👍": 0, "🔥": 0, "😂": 0 },
      createdAt: serverTimestamp(),
    });

    document.getElementById("story").value = "";
    document.getElementById("pw").value = "";
    document.getElementById("story-count").textContent = "0";
    document.getElementById("post-form").classList.add("hidden");
    document.getElementById("open-form-btn").classList.remove("hidden");
  } catch (e) {
    alert("오류가 발생했어요: " + e.message);
    console.error(e);
  } finally {
    document.getElementById("submit-btn").textContent = "올리기";
    document.getElementById("submit-btn").disabled = false;
  }
});

// 글 목록 실시간 로드
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
  const feed = document.getElementById("feed");
  feed.innerHTML = "";
  snapshot.forEach(docSnap => {
    const post = { id: docSnap.id, ...docSnap.data() };
    feed.appendChild(createPostEl(post));
  });
});

function createPostEl(post) {
  const div = document.createElement("div");
  div.className = "post-card";
  const colors = { 순한맛: "#3B6D11", 중간: "#854F0B", 핵팩폭: "#A32D2D" };
  const bgs = { 순한맛: "#EAF3DE", 중간: "#FAEEDA", 핵팩폭: "#FCEBEB" };
  const color = colors[post.intensity];
  const bg = bgs[post.intensity];

  div.innerHTML = `
    <div class="post-header">
      <span class="badge" style="background:${bg};color:${color}">${INTENSITY[post.intensity].emoji} ${post.intensity}</span>
      <button class="delete-btn" data-id="${post.id}">🗑 삭제</button>
    </div>
    <p class="story-text">${post.story}</p>
    <div class="ai-reply" style="border-left:3px solid ${color}">
      <p class="ai-label">AI 팩폭</p>
      <p>${post.aiReply}</p>
    </div>
    <div class="reactions">
      ${["👍","🔥","😂"].map(e => `<button class="reaction-btn" data-id="${post.id}" data-emoji="${e}">${e} ${post.reactions?.[e] || 0}</button>`).join("")}
      <button class="comment-toggle" data-id="${post.id}">💬 댓글</button>
    </div>
    <div class="comment-section hidden" id="comments-${post.id}">
      <div class="comment-list" id="comment-list-${post.id}"></div>
      <div class="comment-input-row">
        <input type="text" placeholder="한마디 남기기... (200자)" maxlength="200" id="comment-input-${post.id}" />
        <input type="password" placeholder="삭제 비밀번호 (선택)" id="comment-pw-${post.id}" />
        <button class="comment-submit" data-id="${post.id}">등록</button>
      </div>
    </div>
  `;

  div.querySelectorAll(".reaction-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const emoji = btn.dataset.emoji;
      const ref = doc(db, "posts", post.id);
      const newCount = (post.reactions?.[emoji] || 0) + 1;
      await updateDoc(ref, { [`reactions.${emoji}`]: newCount });
    });
  });

  div.querySelector(".comment-toggle").addEventListener("click", () => {
    const section = document.getElementById(`comments-${post.id}`);
    section.classList.toggle("hidden");
    if (!section.classList.contains("hidden")) loadComments(post.id);
  });

  div.querySelector(".comment-submit").addEventListener("click", async () => {
    const input = document.getElementById(`comment-input-${post.id}`);
    const pwInput = document.getElementById(`comment-pw-${post.id}`);
    const text = input.value.trim();
    const pw = pwInput.value.trim();
    if (!text) return;
    await addDoc(collection(db, "posts", post.id, "comments"), {
      text, pw: pw || null, createdAt: serverTimestamp(),
    });
    input.value = "";
    pwInput.value = "";
    loadComments(post.id);
  });

  div.querySelector(".delete-btn").addEventListener("click", async () => {
    const savedPw = post.pw;
    if (savedPw) {
      const input = prompt("삭제 비밀번호를 입력해주세요:");
      if (input !== savedPw) return alert("비밀번호가 틀렸어요.");
    } else {
      if (!confirm("삭제할까요?")) return;
    }
    await deleteDoc(doc(db, "posts", post.id));
  });

  return div;
}

async function loadComments(postId) {
  const snap = await getDocs(query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc")));
  const list = document.getElementById(`comment-list-${postId}`);
  list.innerHTML = "";
  snap.forEach(d => {
    const data = d.data();
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `
      <span class="comment-avatar">익</span>
      <p>${data.text}</p>
      <button class="comment-delete-btn">🗑</button>
    `;
    div.querySelector(".comment-delete-btn").addEventListener("click", async () => {
      const savedPw = data.pw;
      if (savedPw) {
        const input = prompt("댓글 삭제 비밀번호를 입력해주세요:");
        if (input !== savedPw) return alert("비밀번호가 틀렸어요.");
      } else {
        if (!confirm("댓글을 삭제할까요?")) return;
      }
      await deleteDoc(doc(db, "posts", postId, "comments", d.id));
      loadComments(postId);
    });
    list.appendChild(div);
  });
}