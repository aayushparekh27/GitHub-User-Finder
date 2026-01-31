// Global variables
let currentUser = null;
let soundEnabled = true;
let theme = 'light';
let apiRemaining = 60;

// DOM Elements
const result = document.getElementById("result");
const usernameInput = document.getElementById("username");
const searchBtn = document.getElementById("search-btn");
const apiRemainingEl = document.getElementById("api-remaining");
const exportModal = document.getElementById("exportModal");

// Audio elements
const searchSound = document.getElementById("searchSound");
const successSound = document.getElementById("successSound");
const errorSound = document.getElementById("errorSound");
const clickSound = document.getElementById("clickSound");

// Initialize
function init() {
  // Load settings from localStorage
  soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
  theme = localStorage.getItem('theme') || 'light';
  
  // Apply theme
  document.documentElement.setAttribute('data-theme', theme);
  
  // Update toggle buttons
  updateToggleButtons();
  
  // Check API rate limit
  checkAPIRateLimit();
  
  // Add event listeners
  usernameInput.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      playSound(clickSound);
      getUser();
    }
  });
  
  // Click sound for all buttons
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => playSound(clickSound));
  });
  
  // Initialize particles
  createParticles();
}

// Create animated particles
function createParticles() {
  const particlesContainer = document.querySelector('.particles');
  const particleCount = 50;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.style.position = 'absolute';
    particle.style.width = Math.random() * 4 + 2 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = `rgba(59, 130, 246, ${Math.random() * 0.3 + 0.1})`;
    particle.style.borderRadius = '50%';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';
    particle.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.5)';
    
    // Animation
    const duration = Math.random() * 20 + 10;
    const delay = Math.random() * 5;
    particle.style.animation = `float ${duration}s linear ${delay}s infinite`;
    
    particlesContainer.appendChild(particle);
  }
}

// Play sound with vibration
function playSound(audioElement) {
  if (!soundEnabled) return;
  
  // Reset and play sound
  audioElement.currentTime = 0;
  audioElement.play().catch(e => console.log("Audio play failed:", e));
  
  // Vibration feedback
  if ('vibrate' in navigator) {
    if (audioElement === successSound) {
      navigator.vibrate([100, 50, 100]); // Success pattern
    } else if (audioElement === errorSound) {
      navigator.vibrate([200, 100, 200]); // Error pattern
    } else {
      navigator.vibrate(50); // Short tap for clicks
    }
  }
}

// Toggle sound
function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', soundEnabled);
  updateToggleButtons();
  playSound(clickSound);
}

// Toggle theme
function toggleTheme() {
  theme = theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  updateToggleButtons();
  playSound(clickSound);
}

// Update toggle buttons
function updateToggleButtons() {
  const soundBtn = document.querySelector('.sound-toggle i');
  const themeBtn = document.querySelector('.theme-toggle i');
  
  soundBtn.className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
  themeBtn.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Check API rate limit
async function checkAPIRateLimit() {
  try {
    const response = await fetch('https://api.github.com/rate_limit');
    const data = await response.json();
    apiRemaining = data.rate.remaining;
    apiRemainingEl.textContent = apiRemaining;
    
    // Update color based on remaining
    if (apiRemaining < 10) {
      apiRemainingEl.style.color = '#ef4444';
    } else if (apiRemaining < 30) {
      apiRemainingEl.style.color = '#f59e0b';
    } else {
      apiRemainingEl.style.color = '#10b981';
    }
  } catch (error) {
    console.log('Failed to fetch rate limit:', error);
  }
}

// Fill username from sample
function fillUsername(username) {
  usernameInput.value = username;
  usernameInput.focus();
  playSound(clickSound);
}

// Show loading skeleton
function showLoadingSkeleton() {
  result.innerHTML = `
    <div class="skeleton-container">
      <div class="skeleton-header">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-text">
          <div class="skeleton-line" style="width: 70%"></div>
          <div class="skeleton-line short"></div>
          <div class="skeleton-line medium"></div>
        </div>
      </div>
      <div class="skeleton-stats">
        <div class="skeleton-stat"></div>
        <div class="skeleton-stat"></div>
        <div class="skeleton-stat"></div>
      </div>
      <div class="skeleton-repos">
        <div class="skeleton-repo"></div>
        <div class="skeleton-repo"></div>
        <div class="skeleton-repo"></div>
      </div>
    </div>
  `;
}

// Get user data
async function getUser() {
  const username = usernameInput.value.trim();

  if (!username) {
    result.innerHTML = `
      <div class="error-card">
        <div class="error-icon">
          <i class="fas fa-exclamation-circle"></i>
        </div>
        <h3>Empty Input</h3>
        <p>Please enter a GitHub username to search</p>
      </div>
    `;
    playSound(errorSound);
    return;
  }

  // Play search sound
  playSound(searchSound);
  
  // Show loading skeleton
  showLoadingSkeleton();
  
  // Disable search button
  searchBtn.disabled = true;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  try {
    // Get user data
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    if (!userRes.ok) throw new Error("User not found");
    const user = await userRes.json();
    
    // Get repositories
    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`);
    const repos = await reposRes.ok ? await reposRes.json() : [];
    
    // Get activity events
    const eventsRes = await fetch(`https://api.github.com/users/${username}/events?per_page=10`);
    const events = await eventsRes.ok ? await eventsRes.json() : [];
    
    // Store current user
    currentUser = { user, repos, events };
    
    // Display results
    displayUserProfile(user, repos, events);
    
    // Play success sound
    playSound(successSound);
    
    // Update API remaining
    apiRemaining -= 1;
    apiRemainingEl.textContent = apiRemaining;
    
  } catch (error) {
    result.innerHTML = `
      <div class="error-card">
        <div class="error-icon">
          <i class="fas fa-user-slash"></i>
        </div>
        <h3>User Not Found</h3>
        <p>The username <strong>"${username}"</strong> doesn't exist on GitHub</p>
      </div>
    `;
    playSound(errorSound);
  } finally {
    // Re-enable search button
    searchBtn.disabled = false;
    searchBtn.innerHTML = '<i class="fas fa-arrow-right"></i>';
  }
}

// Display user profile
function displayUserProfile(user, repos, events) {
  const formatNumber = (num) => num.toLocaleString();
  
  // Language colors mapping
  const languageColors = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'Python': '#3572A5',
    'Java': '#b07219',
    'C++': '#f34b7d',
    'C#': '#178600',
    'PHP': '#4F5D95',
    'Ruby': '#701516',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'Swift': '#ffac45',
    'Kotlin': '#A97BFF',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Vue': '#41b883',
    'React': '#61dafb'
  };
  
  // Process timeline events
  const timelineEvents = processTimelineEvents(events);
  
  // Generate repo cards
  const repoCards = repos.map(repo => `
    <div class="repo-card" onclick="window.open('${repo.html_url}', '_blank')">
      <div class="repo-header">
        <div>
          <div class="repo-name">
            <a href="${repo.html_url}" target="_blank">${repo.name}</a>
          </div>
        </div>
        ${repo.language ? `
          <span class="repo-language">
            <span class="language-dot" style="background: ${languageColors[repo.language] || '#94a3b8'}"></span>
            ${repo.language}
          </span>
        ` : ''}
      </div>
      ${repo.description ? `<div class="repo-description">${repo.description}</div>` : ''}
      <div class="repo-stats">
        <div class="repo-stat">
          <i class="fas fa-star"></i>
          <span>${formatNumber(repo.stargazers_count)}</span>
        </div>
        <div class="repo-stat">
          <i class="fas fa-code-branch"></i>
          <span>${formatNumber(repo.forks_count)}</span>
        </div>
        <div class="repo-stat">
          <i class="fas fa-exclamation-circle"></i>
          <span>${formatNumber(repo.open_issues_count)}</span>
        </div>
      </div>
    </div>
  `).join('');
  
  // Generate timeline items
  const timelineItems = timelineEvents.map(event => `
    <div class="timeline-item">
      <div class="timeline-date">${event.date}</div>
      <div class="timeline-content">
        <div class="timeline-event">${event.type}</div>
        ${event.repo ? `<div class="timeline-repo">${event.repo}</div>` : ''}
      </div>
    </div>
  `).join('');
  
  result.innerHTML = `
    <div class="profile-container">
      <div class="profile-card" onclick="flipCard()">
        <!-- Front Side -->
        <div class="profile-front">
          <div class="profile-header">
            <img src="${user.avatar_url}" alt="Avatar" class="profile-avatar">
            <h2 class="profile-name">${user.name || user.login}</h2>
            <p class="profile-login">@${user.login}</p>
            ${user.location ? `<p style="margin-top: 5px; font-size: 14px;"><i class="fas fa-map-marker-alt"></i> ${user.location}</p>` : ''}
          </div>
          
          ${user.bio ? `
            <div class="profile-bio">
              <p>${user.bio}</p>
            </div>
          ` : ''}
          
          <div class="profile-stats">
            <div class="stat">
              <div class="stat-value">${formatNumber(user.public_repos)}</div>
              <div class="stat-label">Repositories</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatNumber(user.followers)}</div>
              <div class="stat-label">Followers</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatNumber(user.following)}</div>
              <div class="stat-label">Following</div>
            </div>
          </div>
          
          <div class="profile-actions">
            <button onclick="event.stopPropagation(); flipCard();" class="action-btn flip-btn">
              <i class="fas fa-exchange-alt"></i>
              Flip Card
            </button>
            <button onclick="event.stopPropagation(); openExportModal();" class="action-btn export-btn-front">
              <i class="fas fa-download"></i>
              Export Data
            </button>
            <button onclick="event.stopPropagation(); shareProfile();" class="action-btn share-btn">
              <i class="fas fa-share-alt"></i>
              Share
            </button>
          </div>
          
          <p class="flip-hint"><i class="fas fa-mouse-pointer"></i> Click anywhere to flip card</p>
        </div>
        
        <!-- Back Side -->
        <div class="profile-back">
          <div>
            <h3 class="section-title"><i class="fas fa-code"></i> Recent Repositories</h3>
            <div class="repos-grid">
              ${repoCards || '<p style="color: var(--gray); text-align: center;">No repositories found</p>'}
            </div>
          </div>
          
          ${timelineItems ? `
            <div class="activity-timeline">
              <h3 class="section-title"><i class="fas fa-stream"></i> Recent Activity</h3>
              ${timelineItems}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Process timeline events
function processTimelineEvents(events) {
  const eventTypes = {
    'PushEvent': 'Pushed commits to',
    'CreateEvent': 'Created',
    'WatchEvent': 'Starred',
    'ForkEvent': 'Forked',
    'IssuesEvent': 'Opened an issue in',
    'PullRequestEvent': 'Opened a pull request in',
    'DeleteEvent': 'Deleted',
    'PublicEvent': 'Made repository public'
  };
  
  return events.slice(0, 5).map(event => {
    const date = new Date(event.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    return {
      date,
      type: eventTypes[event.type] || event.type,
      repo: event.repo?.name?.replace(/^[^\/]+\//, '')
    };
  });
}

// Flip 3D card
function flipCard() {
  const card = document.querySelector('.profile-card');
  if (card) {
    card.classList.toggle('flipped');
    playSound(clickSound);
  }
}

// Open export modal
function openExportModal() {
  if (!currentUser) return;
  
  // Update share link
  const profileLink = `https://github.com/${currentUser.user.login}`;
  document.getElementById('profileLink').value = profileLink;
  
  // Show modal
  exportModal.style.display = 'flex';
  playSound(clickSound);
}

// Close modal
function closeModal() {
  exportModal.style.display = 'none';
  playSound(clickSound);
}

// Export as JSON
function exportAsJSON() {
  if (!currentUser) return;
  
  const dataStr = JSON.stringify(currentUser, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `github_${currentUser.user.login}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  playSound(successSound);
  closeModal();
}

// Export as Text
function exportAsText() {
  if (!currentUser) return;
  
  const user = currentUser.user;
  const text = `
GitHub Profile: ${user.name || user.login} (@${user.login})
================================================

Bio: ${user.bio || 'Not specified'}
Location: ${user.location || 'Not specified'}
Company: ${user.company || 'Not specified'}
Blog/Website: ${user.blog || 'Not specified'}

Statistics:
- Public Repositories: ${user.public_repos.toLocaleString()}
- Followers: ${user.followers.toLocaleString()}
- Following: ${user.following.toLocaleString()}
- Account Created: ${new Date(user.created_at).toLocaleDateString()}

Profile URL: ${user.html_url}
  `;
  
  const dataUri = 'data:text/plain;charset=utf-8,'+ encodeURIComponent(text);
  const exportFileDefaultName = `github_${user.login}_profile.txt`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  playSound(successSound);
  closeModal();
}

// Take screenshot
async function takeScreenshot() {
  if (!currentUser) return;
  
  try {
    const card = document.querySelector('.profile-card');
    if (!card) return;
    
    // Show loading
    const originalDisplay = card.style.display;
    card.style.display = 'block';
    
    const canvas = await html2canvas(card, {
      backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
      scale: 2,
      useCORS: true
    });
    
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = `github_${currentUser.user.login}_profile.png`;
    link.click();
    
    card.style.display = originalDisplay;
    playSound(successSound);
    closeModal();
  } catch (error) {
    console.error('Screenshot failed:', error);
    playSound(errorSound);
  }
}

// Share profile
function shareProfile() {
  if (!currentUser) return;
  
  const user = currentUser.user;
  const profileUrl = user.html_url;
  const shareText = `Check out ${user.name || user.login}'s GitHub profile: ${profileUrl}`;
  
  if (navigator.share) {
    // Web Share API
    navigator.share({
      title: `${user.name || user.login}'s GitHub Profile`,
      text: shareText,
      url: profileUrl
    }).then(() => {
      playSound(successSound);
    }).catch(() => {
      copyToClipboard(profileUrl);
    });
  } else {
    // Fallback to clipboard
    copyToClipboard(profileUrl);
  }
}

// Copy profile link
function copyProfileLink() {
  const linkInput = document.getElementById('profileLink');
  copyToClipboard(linkInput.value);
}

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Show success message
    const btn = document.querySelector('#shareLinks button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = '';
    }, 2000);
    
    playSound(successSound);
  }).catch(() => {
    playSound(errorSound);
  });
}

// Initialize on load
window.onload = init;

// Close modal when clicking outside
window.onclick = function(event) {
  if (event.target === exportModal) {
    closeModal();
  }
};