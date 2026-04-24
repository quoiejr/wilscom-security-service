// --- LIGHTBOX ---
let lightboxImages = [];
let lightboxIndex = 0;

function openLightbox(img, index) {
  lightboxImages = Array.from(document.querySelectorAll(".gallery-item img"));
  lightboxIndex = index;
  document.getElementById("lightbox-img").src = lightboxImages[lightboxIndex].src;
  document.getElementById("lightbox").classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").classList.remove("active");
  document.body.style.overflow = "";
}

function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
  const imgEl = document.getElementById("lightbox-img");
  imgEl.style.animation = "none";
  imgEl.offsetHeight; // reflow
  imgEl.style.animation = "";
  imgEl.src = lightboxImages[lightboxIndex].src;
}

document.addEventListener("keydown", (e) => {
  const lb = document.getElementById("lightbox");
  if (!lb.classList.contains("active")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") lightboxNav(-1);
  if (e.key === "ArrowRight") lightboxNav(1);
});

document.addEventListener("click", (e) => {
  if (e.target.id === "lightbox") closeLightbox();
});

// Attach lightbox to gallery images after DOM loads
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".gallery-item img").forEach((img, i) => {
    img.addEventListener("click", () => openLightbox(img, i));
  });
});

// --- END LIGHTBOX ---

function toggleChat() {
  const chat = document.getElementById("chat-widget");
  const isVisible = chat.style.display === "flex";
  chat.style.display = isVisible ? "none" : "flex";

  if (!isVisible) {
    // Chat is now open, load messages
    fetchNewMessages();
  }
}

function toggleMobileNav() {
  const navLinks = document.getElementById("navLinks");
  const header = document.querySelector("header");
  navLinks.classList.toggle("active");
  header.classList.toggle("menu-open");
}

// Close menu when clicking a nav link
document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    const navLinks = document.getElementById("navLinks");
    const header = document.querySelector("header");
    navLinks.classList.remove("active");
    header.classList.remove("menu-open");
  });
});

function sendChat() {
  const input = document.getElementById("user-msg");
  const content = document.getElementById("chat-content");
  const message = input.value.trim();
  if (message !== "") {
    // Display user's message immediately
    content.innerHTML += `<p style="text-align:right; margin-bottom:10px;"><b>You:</b> ${message}</p>`;
    input.value = "";
    content.scrollTop = content.scrollHeight;

    // Send to Supabase
    sendMessageToSupabase(message);
  }
}

async function sendMessageToSupabase(message) {
  if (!supabaseClient) {
    console.error("Supabase client not initialized");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .insert([
        {
          user_name: "User",
          message_body: message,
          is_from_admin: false,
        },
      ])
      .select();

    if (error) {
      console.error("Error sending message:", error.message);
    } else {
      console.log("Message sent:", data);
    }
  } catch (error) {
    console.error("Send message error:", error);
  }
}

function clearChat() {
  const content = document.getElementById("chat-content");
  content.innerHTML =
    '<p style="background: #eee; padding: 8px; border-radius: 5px; margin-bottom: 10px;">Chat cleared. Hello. How can Wilscom secure your premises today?</p>';
  content.scrollTop = content.scrollHeight;
}

// Poll for new messages every 5 seconds
setInterval(fetchNewMessages, 5000);

async function fetchNewMessages() {
  if (!supabaseClient) return;

  const chatWidget = document.getElementById("chat-widget");
  if (chatWidget.style.display === "none") return; // Only fetch if chat is open

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .select("user_name, message_body, is_from_admin, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error.message);
      return;
    }

    updateChatContent(data);
  } catch (error) {
    console.error("Fetch messages error:", error);
  }
}

function updateChatContent(messages) {
  const content = document.getElementById("chat-content");
  content.innerHTML = ""; // Clear and rebuild

  messages.forEach((msg) => {
    const alignment = msg.is_from_admin ? "left" : "right";
    const bgColor = msg.is_from_admin ? "#eee" : "#007bff";
    const textColor = msg.is_from_admin ? "#000" : "#fff";
    const sender = msg.is_from_admin ? "Wilscom Support" : "You";

    content.innerHTML += `<p style="text-align:${alignment}; margin-bottom:10px; background:${bgColor}; color:${textColor}; padding:8px; border-radius:5px;"><b>${sender}:</b> ${msg.message_body}</p>`;
  });

  content.scrollTop = content.scrollHeight;
}

async function clearAllConversations() {
  if (!supabaseClient) {
    alert("Supabase not initialized.");
    return;
  }

  const password = prompt("Enter admin password to clear all conversations:");
  if (!password) return;

  if (password !== "admin123") {
    alert("Incorrect admin password.");
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to delete ALL conversations? This cannot be undone.",
  );
  if (!confirmed) return;

  try {
    const { error } = await supabaseClient
      .from("messages")
      .delete()
      .neq("id", 0); // Delete all rows

    if (error) {
      console.error("Error clearing conversations:", error.message);
      alert("Error clearing conversations: " + error.message);
    } else {
      alert("All conversations cleared successfully!");
      clearChat(); // Clear the UI
    }
  } catch (error) {
    console.error("Clear conversations error:", error);
    alert("Error clearing conversations.");
  }
}

// Initialize OpenStreetMap with Wilscom Custom Icon Markers
document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Verify Leaflet is loaded
    if (typeof L === "undefined") {
      console.error("Leaflet library is not loaded");
      return;
    }

    // Verify map container exists
    const mapContainer = document.getElementById("map");
    if (!mapContainer) {
      console.error("Map container not found");
      return;
    }

    var map = L.map("map").setView([6.3106, -10.8047], 12);

    // Create feature group for markers so we can easily clear and reload
    mapMarkerGroup = L.featureGroup().addTo(map);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "",
    }).addTo(map);

    // Custom Icon Configuration
    var wilscomIcon = L.icon({
      iconUrl:
        "https://res.cloudinary.com/dqfcitcay/image/upload/v1775049400/WhatsApp_Image_2026-03-18_at_12.08.15_czqhvm.jpg",
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
    });

    // Store map and icon globally for refresh functionality
    currentMap = map;
    currentIcon = wilscomIcon;

    await loadLocationMarkers(map, wilscomIcon);

    console.log("Map initialized successfully");
  } catch (error) {
    console.error("Error initializing map:", error);
  }
});

// Supabase Configuration
let supabaseClient = null;
let currentMap = null;
let currentIcon = null;
let mapMarkerGroup = null;

// Initialize Supabase when ready
if (typeof window.supabase !== "undefined") {
  try {
    const supabaseUrl = "https://epaloahgcrwuvohpekgj.supabase.co";
    const supabaseKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYWxvYWhnY3J3dXZvaHBla2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDM0NjgsImV4cCI6MjA5MTMxOTQ2OH0.Qz37GoUKTlLE1CfeyXded11fnYwPjJ5IdtXJDRzhq6U";

    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    console.log("Supabase initialized successfully");
  } catch (error) {
    console.error("Error initializing Supabase:", error);
  }
} else {
  console.warn("Supabase library not loaded");
}

async function loadLocationMarkers(map, icon) {
  if (!supabaseClient) {
    console.warn("Supabase client not initialized; showing default markers.");
    addDefaultMarkers(map, icon);
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("locations")
      .select("latitude,longitude,title,status");

    if (error) {
      console.error("Failed to fetch locations:", error.message);
      addDefaultMarkers(map, icon);
      return;
    }

    if (!data || data.length === 0) {
      console.warn("No locations found in Supabase; using default markers.");
      addDefaultMarkers(map, icon);
      return;
    }

    data.forEach((row) => {
      if (row.latitude == null || row.longitude == null) return;
      const popup = `<strong>${row.title || "Location"}</strong>${row.status ? `<br>Status: ${row.status}` : ""}`;
      L.marker([row.latitude, row.longitude], { icon })
        .addTo(mapMarkerGroup)
        .bindPopup(popup);
    });
  } catch (error) {
    console.error("Error loading location markers:", error);
    addDefaultMarkers(map, icon);
  }
}

function addDefaultMarkers(map, icon) {
  const fallbackLocations = [
    // { lat: 6.2907, lng: -10.7816, t: "" },
    // { lat: 6.27, lng: -10.7, t: "" },
    // { lat: 6.34, lng: -10.8, t: "" },
    // { lat: 6.3, lng: -10.75, t: "" },
    // { lat: 6.32, lng: -10.78, t: "" },
  ];

  fallbackLocations.forEach((loc) => {
    L.marker([loc.lat, loc.lng], { icon })
      .addTo(mapMarkerGroup)
      .bindPopup(`<b>${loc.t}</b><br>Secured by Wilscom.`);
  });
}

async function refreshMapMarkers() {
  if (!currentMap || !currentIcon || !mapMarkerGroup) {
    console.error("Map not fully initialized");
    return;
  }

  // Clear existing markers
  mapMarkerGroup.clearLayers();

  // Reload markers
  await loadLocationMarkers(currentMap, currentIcon);
  console.log("Map markers refreshed");
}

// Load jobs on page load
document.addEventListener("DOMContentLoaded", async () => {
  await loadJobs();
});

async function loadJobs() {
  if (!supabaseClient) {
    console.warn("Supabase client not initialized; showing no jobs.");
    document.getElementById("jobs-list").innerHTML =
      "<p>No job listings available.</p>";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("jobs")
      .select("title, description, location, posted_at")
      .order("posted_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch jobs:", error.message);
      document.getElementById("jobs-list").innerHTML =
        "<p>Error loading jobs.</p>";
      return;
    }

    if (!data || data.length === 0) {
      document.getElementById("jobs-list").innerHTML =
        "<p>No job vacancies at this time.</p>";
      return;
    }

    const jobsHtml = data
      .map(
        (job) => `
                  <div class="card" style="margin-bottom: 20px;">
                    <h3>${job.title}</h3>
                    <p><strong>Location:</strong> ${job.location || "Not specified"}</p>
                    <p>${job.description}</p>
                    <p><small>Posted: ${new Date(job.posted_at).toLocaleDateString()}</small></p>
                  </div>
                `,
      )
      .join("");

    document.getElementById("jobs-list").innerHTML = jobsHtml;
  } catch (error) {
    console.error("Error loading jobs:", error);
    document.getElementById("jobs-list").innerHTML =
      "<p>Error loading jobs.</p>";
  }
}

async function refreshJobs() {
  await loadJobs();
  console.log("Jobs refreshed");
}

async function testConnection() {
  if (!supabaseClient) {
    console.error("Supabase client is not initialized");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .insert([
        {
          user_name: "Test User",
          message_body: "Testing again!",
          is_from_admin: false,
        },
      ])
      .select();

    if (error) {
      console.error("Error:", error.message);
    } else {
      console.log("Success! Check your dashboard now:", data);
    }
  } catch (error) {
    console.error("Connection test error:", error);
  }
}

async function pushData() {
  if (!supabaseClient) {
    console.error("Supabase client is not initialized");
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("messages")
      .insert([
        {
          user_name: "Final Test",
          message_body: "Check the dashboard now!",
        },
      ])
      .select();

    if (error) {
      console.error("Insert failed:", error.message);
    } else {
      console.log("Insert worked! Data:", data);
    }
  } catch (error) {
    console.error("pushData error:", error);
  }
}

// Uncomment the line below to test data insertion
// pushData();

async function saveMapMarker() {
  if (!supabaseClient) {
    console.error("Supabase client is not initialized");
    return;
  }

  const { data, error } = await supabaseClient
    .from("locations")
    .insert([
      {
        latitude: 6.3156,
        longitude: -10.8074,
        title: "Project Location",
        status: "active",
      },
    ])
    .select();

  if (error) {
    console.error("Map Error:", error.message);
  } else {
    console.log("Marker saved to Supabase:", data);
  }
}

// map javascript code here
async function getMapData() {
  const { data, error } = await _supabase.from("locations").select("*");

  if (data) {
    data.forEach((loc) => {
      // loc.latitude and loc.longitude must match the SQL names!
      L.marker([loc.latitude, loc.longitude])
        .addTo(map)
        .bindPopup(`<b>${loc.name}</b><br>${loc.description}`);
    });
  }
}

async function loadMarkers() {
  const { data, error } = await _supabase.from("locations").select("*");

  if (error) {
    console.error(error);
    return;
  }

  // Use data while it's still "alive" inside this function
  if (data) {
    data.forEach((loc) => {
      L.marker([loc.latitude, loc.longitude]).addTo(map);
    });
  }
}
