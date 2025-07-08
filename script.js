// Global state
let currentLocation = null;
let isEmergencyActive = false;
let emergencyAlerts = [
  {
    id: '1',
    userId: 'user1',
    userName: 'Nguyễn Văn A',
    location: { lat: 21.0285, lng: 105.8542 },
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: 'active',
    priority: 'high',
    message: 'Tai nạn xe hơi trên Quốc lộ 1, cần hỗ trợ ngay lập tức'
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Trần Thị B',
    location: { lat: 21.0195, lng: 105.8626 },
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    status: 'responding',
    priority: 'medium',
    message: 'Cấp cứu y tế tại nhà'
  }
];

let rescueTeams = [
  {
    id: 'team1',
    name: 'Đội Cấp cứu Alpha',
    location: { lat: 21.0245, lng: 105.8412 },
    status: 'available'
  },
  {
    id: 'team2',
    name: 'Đội Y tế Beta',
    location: { lat: 21.0155, lng: 105.8556 },
    status: 'responding',
    assignedAlert: '2'
  }
];

let emergencyContacts = [
  {
    id: '1',
    name: 'BS. Nguyễn Thị C',
    phone: '+84-123-456-789',
    relationship: 'Y tế',
    isPrimary: true
  },
  {
    id: '2',
    name: 'Lê Văn D',
    phone: '+84-987-654-321',
    relationship: 'Gia đình',
    isPrimary: false
  }
];

let map = null;
let userMarker = null;
let alertMarkers = [];
let teamMarkers = [];

// DOM elements
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileNav = document.getElementById('mobileNav');
const sosButton = document.getElementById('sosButton');
const countdown = document.getElementById('countdown');
const countdownMessage = document.getElementById('countdownMessage');
const countdownSeconds = document.getElementById('countdownSeconds');
const emergencyActive = document.getElementById('emergencyActive');
const locationError = document.getElementById('locationError');
const retryLocation = document.getElementById('retryLocation');
const locationBtn = document.getElementById('locationBtn');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  initializeNavigation();
  initializeGeolocation();
  initializeSOSButton();
  initializeDashboard();
  initializeContacts();
  initializeLocationButton();
  updateDashboardStats();
});

// Navigation
function initializeNavigation() {
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active tab
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update mobile nav tabs too
      document.querySelectorAll('.nav-mobile .nav-tab').forEach(t => {
        if (t.dataset.tab === targetTab) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });
      
      // Update desktop nav tabs too
      document.querySelectorAll('.nav-desktop .nav-tab').forEach(t => {
        if (t.dataset.tab === targetTab) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      });

      // Show target content
      tabContents.forEach(content => {
        if (content.id === `${targetTab}-tab`) {
          content.classList.add('active');
          if (targetTab === 'map') {
            setTimeout(() => initializeMap(), 100);
          }
        } else {
          content.classList.remove('active');
        }
      });

      // Close mobile menu
      mobileNav.classList.remove('active');
    });
  });

  // Mobile menu toggle
  mobileMenuBtn.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
  });
}

// Geolocation
function initializeGeolocation() {
  getCurrentLocation();
  
  retryLocation.addEventListener('click', getCurrentLocation);
}

function getCurrentLocation() {
  if (!navigator.geolocation) {
    showLocationError('Trình duyệt không hỗ trợ định vị');
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000
  };

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date()
      };
      hideLocationError();
      sosButton.disabled = false;
      updateMapUserLocation();
    },
    (error) => {
      showLocationError(`Lỗi định vị: ${error.message}`);
      sosButton.disabled = true;
    },
    options
  );
}

function showLocationError(message) {
  locationError.classList.remove('hidden');
  locationError.querySelector('p').textContent = message;
}

function hideLocationError() {
  locationError.classList.add('hidden');
}

// Location Button
function initializeLocationButton() {
  if (locationBtn) {
    locationBtn.addEventListener('click', () => {
      if (currentLocation && map) {
        // Add loading animation
        locationBtn.classList.add('loading');
        
        // Animate to current location
        map.flyTo([currentLocation.lat, currentLocation.lng], 15, {
          duration: 1.5,
          easeLinearity: 0.25
        });
        
        // Remove loading animation after animation completes
        setTimeout(() => {
          locationBtn.classList.remove('loading');
        }, 1500);
        
        // Show user marker popup
        if (userMarker) {
          setTimeout(() => {
            userMarker.openPopup();
          }, 1600);
        }
      } else if (!currentLocation) {
        // Try to get location if not available
        locationBtn.classList.add('loading');
        getCurrentLocation();
        setTimeout(() => {
          locationBtn.classList.remove('loading');
        }, 3000);
      }
    });
  }
}

// SOS Button
function initializeSOSButton() {
  let countdownTimer = null;
  let countdownValue = 3;
  let isPressed = false;

  sosButton.addEventListener('mousedown', startCountdown);
  sosButton.addEventListener('mouseup', cancelCountdown);
  sosButton.addEventListener('touchstart', startCountdown);
  sosButton.addEventListener('touchend', cancelCountdown);
  sosButton.addEventListener('mouseleave', cancelCountdown);

  function startCountdown() {
    if (isEmergencyActive || !currentLocation) return;
    
    isPressed = true;
    countdownValue = 3;
    sosButton.classList.add('active');
    showCountdownMessage();
    
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    countdownTimer = setInterval(() => {
      countdownValue--;
      updateCountdownDisplay();
      
      if (countdownValue <= 0) {
        activateEmergency();
        cancelCountdown();
      }
    }, 1000);
  }

  function cancelCountdown() {
    if (!isPressed) return;
    
    isPressed = false;
    sosButton.classList.remove('active');
    hideCountdownMessage();
    
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function showCountdownMessage() {
    countdownMessage.classList.remove('hidden');
    updateCountdownDisplay();
  }

  function hideCountdownMessage() {
    countdownMessage.classList.add('hidden');
  }

  function updateCountdownDisplay() {
    countdownSeconds.textContent = countdownValue;
    countdown.textContent = countdownValue;
  }

  function activateEmergency() {
    if (!currentLocation) return;
    
    isEmergencyActive = true;
    sosButton.classList.add('active');
    emergencyActive.classList.remove('hidden');
    
    // Create new emergency alert
    const newAlert = {
      id: Date.now().toString(),
      userId: 'current-user',
      userName: 'Người dùng hiện tại',
      location: currentLocation,
      timestamp: new Date(),
      status: 'active',
      priority: 'critical',
      message: 'SOS khẩn cấp được kích hoạt'
    };

    emergencyAlerts.unshift(newAlert);
    updateDashboardStats();
    updateAlertsList();
    
    // Switch to map view
    document.querySelector('.nav-tab[data-tab="map"]').click();
    
    // Simulate emergency services notification
    console.log('Cảnh báo khẩn cấp đã gửi:', newAlert);
    
    // Notify emergency contacts
    notifyEmergencyContacts();
  }
}

function notifyEmergencyContacts() {
  emergencyContacts.forEach(contact => {
    if (contact.isPrimary) {
      console.log(`Thông báo khẩn cấp gửi đến ${contact.name}: ${contact.phone}`);
      // In a real app, this would send SMS or make calls
    }
  });
}

// Map
function initializeMap() {
  if (map) return;

  const center = currentLocation ? [currentLocation.lat, currentLocation.lng] : [21.0285, 105.8542];
  
  map = L.map('map').setView(center, 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  updateMapUserLocation();
  updateMapAlerts();
  updateMapTeams();

  map.on('click', (e) => {
    console.log('Bản đồ được click:', e.latlng);
  });
}

function updateMapUserLocation() {
  if (!map || !currentLocation) return;

  if (userMarker) {
    map.removeLayer(userMarker);
  }

  const userIcon = L.divIcon({
    className: 'user-marker',
    html: `<div style="background: #2563EB; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  userMarker = L.marker([currentLocation.lat, currentLocation.lng], { icon: userIcon })
    .addTo(map)
    .bindPopup(`
      <div style="padding: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span style="font-weight: 600;">Vị trí của bạn</span>
        </div>
        <p style="font-size: 14px; color: #6B7280; margin: 0;">
          Cập nhật lần cuối: ${currentLocation.timestamp.toLocaleTimeString()}
        </p>
        ${currentLocation.accuracy ? `<p style="font-size: 12px; color: #9CA3AF; margin: 4px 0 0 0;">
          Độ chính xác: ±${Math.round(currentLocation.accuracy)}m
        </p>` : ''}
      </div>
    `);

  map.setView([currentLocation.lat, currentLocation.lng], 13);
}

function updateMapAlerts() {
  if (!map) return;

  // Clear existing markers
  alertMarkers.forEach(marker => map.removeLayer(marker));
  alertMarkers = [];

  emergencyAlerts.forEach(alert => {
    const color = getAlertColor(alert.status);
    const alertIcon = L.divIcon({
      className: 'alert-marker',
      html: `<div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([alert.location.lat, alert.location.lng], { icon: alertIcon })
      .addTo(map)
      .bindPopup(`
        <div style="padding: 12px; min-width: 250px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span style="font-weight: 600;">${alert.userName}</span>
            </div>
            <span style="font-size: 12px; padding: 4px 8px; border-radius: 12px; background: ${getStatusBadgeColor(alert.status)}; color: white; text-transform: uppercase;">
              ${getStatusText(alert.status)}
            </span>
          </div>
          
          <div style="margin-bottom: 8px; font-size: 14px;">
            <p style="margin: 4px 0; color: #6B7280;">
              Mức độ: <span style="font-weight: 600; color: ${getPriorityColor(alert.priority)};">
                ${getPriorityText(alert.priority)}
              </span>
            </p>
            <p style="margin: 4px 0; color: #6B7280;">
              Thời gian: ${alert.timestamp.toLocaleString()}
            </p>
          </div>
          
          ${alert.message ? `<p style="margin: 8px 0; padding: 8px; background: #F3F4F6; border-radius: 6px; font-size: 14px;">
            ${alert.message}
          </p>` : ''}
          
          ${alert.status !== 'resolved' ? `<div style="margin-top: 12px; display: flex; gap: 8px;">
            ${alert.status === 'active' ? `<button onclick="updateAlertStatus('${alert.id}', 'responding')" style="padding: 4px 12px; background: #D97706; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
              Phản ứng
            </button>` : ''}
            <button onclick="updateAlertStatus('${alert.id}', 'resolved')" style="padding: 4px 12px; background: #059669; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
              Đánh dấu đã giải quyết
            </button>
          </div>` : ''}
        </div>
      `);

    alertMarkers.push(marker);
  });
}

function updateMapTeams() {
  if (!map) return;

  // Clear existing markers
  teamMarkers.forEach(marker => map.removeLayer(marker));
  teamMarkers = [];

  rescueTeams.forEach(team => {
    const teamIcon = L.divIcon({
      className: 'team-marker',
      html: `<div style="background: #059669; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([team.location.lat, team.location.lng], { icon: teamIcon })
      .addTo(map)
      .bindPopup(`
        <div style="padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span style="font-weight: 600;">${team.name}</span>
          </div>
          <p style="font-size: 14px; color: ${getTeamStatusColor(team.status)}; margin: 0;">
            Trạng thái: ${getTeamStatusText(team.status)}
          </p>
          ${team.assignedAlert ? `<p style="font-size: 12px; color: #6B7280; margin: 4px 0 0 0;">
            Được giao: ${team.assignedAlert}
          </p>` : ''}
        </div>
      `);

    teamMarkers.push(marker);
  });
}

// Dashboard
function initializeDashboard() {
  updateAlertsList();
  updateTeamsList();
}

function updateDashboardStats() {
  const activeAlerts = emergencyAlerts.filter(alert => alert.status === 'active').length;
  const respondingAlerts = emergencyAlerts.filter(alert => alert.status === 'responding').length;
  const resolvedAlerts = emergencyAlerts.filter(alert => alert.status === 'resolved').length;
  const availableTeams = rescueTeams.filter(team => team.status === 'available').length;

  document.getElementById('activeAlerts').textContent = activeAlerts;
  document.getElementById('respondingAlerts').textContent = respondingAlerts;
  document.getElementById('resolvedAlerts').textContent = resolvedAlerts;
  document.getElementById('availableTeams').textContent = availableTeams;
}

function updateAlertsList() {
  const alertsList = document.getElementById('alertsList');
  
  if (emergencyAlerts.length === 0) {
    alertsList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <p>Không có cảnh báo khẩn cấp nào lúc này</p>
      </div>
    `;
    return;
  }

  alertsList.innerHTML = emergencyAlerts.map(alert => `
    <div class="alert-item status-${alert.status}">
      <div class="alert-header">
        <div class="alert-info">
          <div class="alert-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${getStatusIcon(alert.status)}
            </svg>
            <span>${alert.userName}</span>
            <span class="priority-badge priority-${alert.priority}">
              ${getPriorityText(alert.priority)}
            </span>
          </div>
          
          <div class="alert-details">
            <div class="alert-detail">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <span>${alert.timestamp.toLocaleString()}</span>
            </div>
            <div class="alert-detail">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${alert.location.lat.toFixed(6)}, ${alert.location.lng.toFixed(6)}</span>
            </div>
          </div>
          
          ${alert.message ? `<div class="alert-message">${alert.message}</div>` : ''}
        </div>
        
        ${alert.status !== 'resolved' ? `<div class="alert-actions">
          ${alert.status === 'active' ? `<button class="btn-warning" onclick="updateAlertStatus('${alert.id}', 'responding')">
            Phản ứng
          </button>` : ''}
          <button class="btn-success" onclick="updateAlertStatus('${alert.id}', 'resolved')">
            Đánh dấu đã giải quyết
          </button>
        </div>` : ''}
      </div>
    </div>
  `).join('');
}

function updateTeamsList() {
  const teamsList = document.getElementById('teamsList');
  
  teamsList.innerHTML = rescueTeams.map(team => `
    <div class="team-card ${team.status}">
      <div class="team-header">
        <div class="team-info">
          <div class="team-icon ${team.status}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div class="team-name">${team.name}</div>
            <div class="team-location">${team.location.lat.toFixed(4)}, ${team.location.lng.toFixed(4)}</div>
          </div>
        </div>
        
        <span class="team-status ${team.status}">
          ${getTeamStatusText(team.status)}
        </span>
      </div>
      
      ${team.assignedAlert ? `<div class="team-assignment">
        Được giao: ${team.assignedAlert}
      </div>` : ''}
    </div>
  `).join('');
}

function updateAlertStatus(alertId, status) {
  const alertIndex = emergencyAlerts.findIndex(alert => alert.id === alertId);
  if (alertIndex !== -1) {
    emergencyAlerts[alertIndex].status = status;
    
    // If it's the current user's emergency and it's resolved, deactivate
    if (alertId === emergencyAlerts.find(a => a.userId === 'current-user')?.id && status === 'resolved') {
      isEmergencyActive = false;
      sosButton.classList.remove('active');
      emergencyActive.classList.add('hidden');
    }
    
    updateDashboardStats();
    updateAlertsList();
    updateMapAlerts();
  }
}

// Contacts
function initializeContacts() {
  const addContactBtn = document.getElementById('addContactBtn');
  const contactForm = document.getElementById('contactForm');
  const contactFormElement = document.getElementById('contactFormElement');
  const cancelFormBtn = document.getElementById('cancelFormBtn');
  const formSubmitText = document.getElementById('formSubmitText');

  let editingContactId = null;

  addContactBtn.addEventListener('click', () => {
    showContactForm();
  });

  cancelFormBtn.addEventListener('click', () => {
    hideContactForm();
  });

  contactFormElement.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const contactData = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      relationship: formData.get('relationship'),
      isPrimary: formData.has('isPrimary')
    };

    if (editingContactId) {
      updateContact(editingContactId, contactData);
    } else {
      addContact(contactData);
    }

    hideContactForm();
  });

  function showContactForm(contact = null) {
    editingContactId = contact ? contact.id : null;
    
    if (contact) {
      contactFormElement.name.value = contact.name;
      contactFormElement.phone.value = contact.phone;
      contactFormElement.relationship.value = contact.relationship;
      contactFormElement.isPrimary.checked = contact.isPrimary;
      formSubmitText.textContent = 'Cập nhật liên hệ';
    } else {
      contactFormElement.reset();
      formSubmitText.textContent = 'Thêm liên hệ';
    }
    
    contactForm.classList.remove('hidden');
  }

  function hideContactForm() {
    contactForm.classList.add('hidden');
    contactFormElement.reset();
    editingContactId = null;
  }

  function addContact(contactData) {
    const newContact = {
      ...contactData,
      id: Date.now().toString()
    };
    emergencyContacts.push(newContact);
    updateContactsList();
  }

  function updateContact(id, contactData) {
    const contactIndex = emergencyContacts.findIndex(contact => contact.id === id);
    if (contactIndex !== -1) {
      emergencyContacts[contactIndex] = { ...emergencyContacts[contactIndex], ...contactData };
      updateContactsList();
    }
  }

  window.editContact = function(id) {
    const contact = emergencyContacts.find(c => c.id === id);
    if (contact) {
      showContactForm(contact);
    }
  };

  window.deleteContact = function(id) {
    if (confirm('Bạn có chắc chắn muốn xóa liên hệ này?')) {
      emergencyContacts = emergencyContacts.filter(contact => contact.id !== id);
      updateContactsList();
    }
  };

  updateContactsList();
}

function updateContactsList() {
  const contactsList = document.getElementById('contactsList');
  
  if (emergencyContacts.length === 0) {
    contactsList.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <p>Chưa có liên hệ khẩn cấp nào</p>
        <p class="empty-subtitle">Thêm liên hệ để nhanh chóng liên lạc trong trường hợp khẩn cấp</p>
      </div>
    `;
    return;
  }

  contactsList.innerHTML = emergencyContacts.map(contact => `
    <div class="contact-card">
      <div class="contact-header">
        <div class="contact-info">
          <div class="contact-avatar">
            ${contact.name.charAt(0).toUpperCase()}
          </div>
          <div class="contact-details">
            <h3>
              ${contact.name}
              ${contact.isPrimary ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>` : ''}
            </h3>
            <div class="contact-phone">${contact.phone}</div>
            <div class="contact-relationship">${contact.relationship}</div>
          </div>
        </div>
        
        <div class="contact-actions">
          <button onclick="callNumber('${contact.phone}')" style="background: #059669; color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <button onclick="editContact('${contact.id}')" style="background: #2563EB; color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onclick="deleteContact('${contact.id}')" style="background: #DC2626; color: white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Utility functions
function callNumber(phone) {
  window.location.href = `tel:${phone}`;
}

function getAlertColor(status) {
  switch (status) {
    case 'active': return '#DC2626';
    case 'responding': return '#D97706';
    case 'resolved': return '#059669';
    default: return '#6B7280';
  }
}

function getStatusBadgeColor(status) {
  switch (status) {
    case 'active': return '#DC2626';
    case 'responding': return '#D97706';
    case 'resolved': return '#059669';
    default: return '#6B7280';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'active': return 'Đang hoạt động';
    case 'responding': return 'Đang phản ứng';
    case 'resolved': return 'Đã giải quyết';
    default: return 'Không xác định';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'active': return `<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>`;
    case 'responding': return `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`;
    case 'resolved': return `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/>`;
    default: return `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>`;
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'critical': return '#DC2626';
    case 'high': return '#F97316';
    case 'medium': return '#D97706';
    case 'low': return '#059669';
    default: return '#6B7280';
  }
}

function getPriorityText(priority) {
  switch (priority) {
    case 'critical': return 'Cực kỳ khẩn cấp';
    case 'high': return 'Cao';
    case 'medium': return 'Trung bình';
    case 'low': return 'Thấp';
    default: return 'Không xác định';
  }
}

function getTeamStatusColor(status) {
  switch (status) {
    case 'available': return '#059669';
    case 'responding': return '#D97706';
    case 'busy': return '#DC2626';
    default: return '#6B7280';
  }
}

function getTeamStatusText(status) {
  switch (status) {
    case 'available': return 'Có sẵn';
    case 'responding': return 'Đang phản ứng';
    case 'busy': return 'Bận';
    default: return 'Không xác định';
  }
}