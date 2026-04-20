document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const authStatusText = document.getElementById("auth-status-text");
  const authPanel = document.getElementById("auth-panel");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const openLoginBtn = document.getElementById("open-login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const closeLoginBtn = document.getElementById("close-login-btn");
  const closeRegisterBtn = document.getElementById("close-register-btn");
  const registerActivityInput = document.getElementById("register-activity");
  const registerEmailInput = document.getElementById("register-email");

  let authState = {
    authenticated: false,
    username: null,
  };

  function showMessage(text, type = "info") {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function fetchAuthStatus() {
    try {
      const response = await fetch("/auth/status");
      authState = await response.json();
    } catch (error) {
      authState = { authenticated: false, username: null };
      console.error("Error fetching auth status:", error);
    }
    renderAuthPanel();
  }

  function renderAuthPanel() {
    if (authState.authenticated) {
      authStatusText.textContent = `Logged in: ${authState.username}`;
      openLoginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      authStatusText.textContent = "Not logged in";
      openLoginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
  }

  function closeModal(modal) {
    modal.classList.add("hidden");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        authState.authenticated
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        const registerButtonHTML = authState.authenticated
          ? `<button class="register-btn" data-activity="${name}">Register Student</button>`
          : "";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${registerButtonHTML}
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });

      document.querySelectorAll(".register-btn").forEach((button) => {
        button.addEventListener("click", () => {
          registerActivityInput.value = button.getAttribute("data-activity");
          registerEmailInput.value = "";
          openModal(registerModal);
        });
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle register form submission
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = registerEmailInput.value;
    const activity = registerActivityInput.value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeModal(registerModal);
        registerForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to register student. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeModal(loginModal);
        loginForm.reset();
        await fetchAuthStatus();
        await fetchActivities();
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/auth/logout", { method: "POST" });
      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "info");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }

    await fetchAuthStatus();
    await fetchActivities();
  });

  userMenuBtn.addEventListener("click", () => {
    authPanel.classList.toggle("hidden");
  });

  openLoginBtn.addEventListener("click", () => {
    openModal(loginModal);
  });

  closeLoginBtn.addEventListener("click", () => closeModal(loginModal));
  closeRegisterBtn.addEventListener("click", () => closeModal(registerModal));

  // Close auth panel when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".user-controls")) {
      authPanel.classList.add("hidden");
    }
  });

  // Initialize app
  fetchAuthStatus().then(fetchActivities);
});
