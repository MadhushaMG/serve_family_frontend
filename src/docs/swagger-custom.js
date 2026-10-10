(function () {
  // Inject a small Dev Login button into Swagger UI (development convenience)
  function tryAddButton() {
    const container = document.querySelector(".swagger-ui .topbar");
    if (!container) return;

    if (document.getElementById("dev-login-btn")) return; // already added

    const btn = document.createElement("button");
    btn.id = "dev-login-btn";
    btn.innerText = "Dev Login";
    btn.style.marginLeft = "12px";
    btn.className = "btn authorize";

    btn.onclick = async function () {
      const email = prompt("Dev email to login as", "father@example.com");
      if (!email) return;
      try {
        const res = await fetch("/api/auth/dev-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email, name: email.split("@")[0] }),
        });
        const data = await res.json();
        if (!data || !data.token) {
          alert("Login failed: " + (data?.message || res.status));
          return;
        }
        const token = data.token;
        // store for persistence
        localStorage.setItem("devToken", token);
        // preauthorize in Swagger UI
        try {
          if (window.ui && window.ui.preauthorizeApiKey) {
            window.ui.preauthorizeApiKey("bearerAuth", "Bearer " + token);
            alert("Dev token set in Swagger (Authorization applied)");
          } else if (window.ui && window.ui.authActions && window.ui.authActions.authorize) {
            window.ui.authActions.authorize({
              bearerAuth: {
                name: "bearerAuth",
                schema: { type: "http", scheme: "bearer" },
                value: "Bearer " + token,
              },
            });
            alert("Dev token set in Swagger (Authorization applied)");
          } else {
            alert("Token received. Paste into Authorize dialog: Bearer " + token);
          }
        } catch (e) {
          console.error(e);
          alert("Token received. Paste into Authorize dialog: Bearer " + token);
        }
      } catch (err) {
        alert("Dev login error: " + err);
      }
    };

    container.appendChild(btn);
  }

  // Wait for swagger UI to render
  const maxTrials = 20;
  let trials = 0;
  const id = setInterval(() => {
    tryAddButton();
    trials++;
    if (trials > maxTrials) clearInterval(id);
  }, 500);
})();
