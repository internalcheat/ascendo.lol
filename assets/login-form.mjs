import { accountRequest, readSession, saveSession } from "./waiting-auth.mjs";

const card = document.getElementById('card');
let mode = 'login';
let locked = false;

function go(next){
  if(locked || next === mode) return;
  locked = true;
  mode = next;

  // The reference behavior:
  // register -> purple "New here?" panel sweeps from right to left,
  // revealing the register form on the right.
  // login -> exact reverse.
  card.classList.toggle('register', next === 'register');

  setTimeout(() => locked = false, 710);
}

document.querySelectorAll('[data-go]').forEach(btn=>{
  btn.addEventListener('click', () => go(btn.dataset.go));
});

document.querySelectorAll('.primary').forEach(btn=>{
  btn.addEventListener('pointerdown', e=>{
    const r=btn.getBoundingClientRect();
    const d=Math.max(r.width,r.height);
    const s=document.createElement('span');
    s.className='ripple';
    s.style.width=s.style.height=d+'px';
    s.style.left=(e.clientX-r.left-d/2)+'px';
    s.style.top=(e.clientY-r.top-d/2)+'px';
    btn.appendChild(s);
    s.addEventListener('animationend',()=>s.remove());
  });
});


const registerPassword = document.getElementById("registerPassword");
const togglePassword = document.getElementById("togglePassword");
const strengthBar = document.getElementById("strengthBar");
const strengthLabel = document.getElementById("strengthLabel");
const strengthReq = document.getElementById("strengthReq");

togglePassword?.addEventListener("click",()=>{
  const showing = registerPassword.type === "text";
  registerPassword.type = showing ? "password" : "text";
  togglePassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  togglePassword.animate(
    [{transform:"translateY(-50%) scale(.88)"},{transform:"translateY(-50%) scale(1.06)"},{transform:"translateY(-50%) scale(1)"}],
    {duration:220,easing:"cubic-bezier(.22,.88,.28,1)"}
  );
});

registerPassword?.addEventListener("input",()=>{
  const v = registerPassword.value;
  let score = 0;
  if(v.length >= 8) score++;
  if(/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
  if(/\d/.test(v)) score++;
  if(/[^A-Za-z0-9]/.test(v)) score++;

  const widths = ["0%","28%","52%","76%","100%"];
  const colors = ["#d7d7dd","#e46d7b","#e3a14a","#8e72f4","#32b99c"];
  const labels = ["Use 8+ characters","Weak","Fair","Good","Strong"];

  strengthBar.style.width = widths[score];
  strengthBar.style.background = colors[score];
  strengthLabel.textContent = labels[score];
  strengthReq.classList.toggle("ok", score >= 3);
});

const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const messages = {
  invalid_input: "Check the fields and try again.",
  invalid_credentials: "The email, username, or password is incorrect.",
  account_unavailable: "That username or email is unavailable.",
  rate_limited: "Too many attempts. Try again later.",
  storage_blocked: "Allow browser storage to stay signed in.",
  unavailable: "Sign-in is temporarily unavailable. Try again shortly.",
};
let submitting = false;

function showStatus(element, message, isError = false) {
  element.textContent = message;
  element.toggleAttribute("data-error", isError);
}

function handleForm(form, action, status) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    showStatus(status, "");
    if (!form.reportValidity()) return;

    const password = form.elements.password.value;
    if (new TextEncoder().encode(password).length > 72) {
      showStatus(status, "Your password must be at most 72 bytes.", true);
      return;
    }

    const isSignUp = action === "signup";
    const remember = !isSignUp && document.querySelector("#loginRemember").checked;
    const fields = isSignUp
      ? { username: form.elements.username.value.trim(), email: form.elements.email.value.trim(), password }
      : { identifier: form.elements.identifier.value.trim(), password, remember };
    const button = form.querySelector('button[type="submit"]');
    submitting = true;
    button.disabled = true;
    showStatus(status, isSignUp ? "Creating your account…" : "Signing in…");

    try {
      const { token } = await accountRequest(action, fields);
      saveSession(token, remember);
      form.reset();
      location.assign("/wait/");
    } catch (error) {
      showStatus(status, messages[error.code] || messages.unavailable, true);
    } finally {
      submitting = false;
      button.disabled = false;
    }
  });
}

handleForm(loginForm, "signin", document.querySelector("#loginStatus"));
handleForm(registerForm, "signup", document.querySelector("#registerStatus"));

for (const button of document.querySelectorAll(".social")) {
  button.addEventListener("click", () => {
    showStatus(
      document.querySelector("#loginStatus"),
      `${button.textContent.trim()} sign-in is unavailable. Use your email or username.`,
    );
  });
}

const previousSession = readSession();
if (previousSession) {
  accountRequest("session", {}, previousSession).then(() => {
    if (!submitting && readSession() === previousSession) location.replace("/wait/");
  }).catch(() => {});
}
