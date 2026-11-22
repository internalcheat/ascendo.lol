import { accountRequest, clearSession, readSession } from "./waiting-auth.mjs";

const status = document.querySelector("#waitStatus");
const content = document.querySelector("#waitContent");
const signOut = document.querySelector("#signOutButton");
const retry = document.querySelector("#retrySessionButton");

function returnToLogin() {
  clearSession();
  location.replace("/");
}

async function checkSession() {
  const token = readSession();
  if (!token) {
    returnToLogin();
    return;
  }

  retry.hidden = true;
  status.hidden = false;
  status.textContent = "Checking your session…";
  try {
    await accountRequest("session", {}, token);
    if (readSession() !== token) {
      void checkSession();
      return;
    }
    status.hidden = true;
    content.hidden = false;
  } catch (error) {
    if (readSession() !== token) void checkSession();
    else if (error.code === "invalid_session") returnToLogin();
    else {
      status.textContent = "Couldn’t check your session.";
      retry.hidden = false;
    }
  }
}

retry.addEventListener("click", checkSession);
signOut.addEventListener("click", async () => {
  const token = readSession();
  if (!token) {
    returnToLogin();
    return;
  }
  signOut.disabled = true;
  try {
    await accountRequest("signout", {}, token);
    returnToLogin();
  } catch (error) {
    if (error.code === "invalid_session") returnToLogin();
    else {
      status.hidden = false;
      status.textContent = "Couldn’t sign out. Please try again.";
      signOut.disabled = false;
    }
  }
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    content.hidden = true;
    void checkSession();
  }
});
void checkSession();
