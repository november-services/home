// scheduler.js
const CLIENT_ID = '1097210233648-tqq2qv1t4b2bfvfo1277el4vqvdkiiin.apps.googleusercontent.com';
const API_KEY = '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';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
];
const SCOPES = 'https://www.googleapis.com/auth/calendar';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorizeButton').addEventListener('click', handleAuthClick);
document.getElementById('meetingForm').addEventListener('submit', scheduleMeeting);

function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: DISCOVERY_DOCS,
  });
  gapiInited = true;
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // Defined later
  });
  gisInited = true;
}

function handleAuthClick() {
  tokenClient.callback = async (resp) => {
    if (resp.error !== undefined) {
      throw resp;
    }
    document.getElementById('scheduleButton').disabled = false;
  };

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({prompt: 'consent'});
  } else {
    tokenClient.requestAccessToken({prompt: ''});
  }
}

async function scheduleMeeting(e) {
  e.preventDefault();
  
  const title = document.getElementById('title').value;
  const datetime = document.getElementById('datetime').value;
  const duration = parseInt(document.getElementById('duration').value);
  const guests = document.getElementById('guests').value.split(',').map(g => g.trim()).filter(g => g);
  const agenda = document.getElementById('agenda').value;
  
  const startTime = new Date(datetime);
  const endTime = new Date(startTime.getTime() + duration * 60000);
  
  const event = {
    summary: title,
    description: agenda,
    start: {
      dateTime: startTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    },
    attendees: guests.map(email => ({email})),
    conferenceData: {
      createRequest: {
        requestId: Math.random().toString(36).substring(2, 10),
        conferenceSolutionKey: {type: 'hangoutsMeet'}
      }
    },
    reminders: {
      useDefault: true
    }
  };

  try {
    const response = await gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });
    
    const meetLink = response.result.hangoutLink;
    document.getElementById('meetLink').innerHTML = `
      <p>Meeting scheduled!</p>
      <a href="${meetLink}" target="_blank">Join Meeting</a>
    `;
    
    // Send invites (optional)
    if (guests.length > 0) {
      sendEmailInvites(title, startTime, endTime, meetLink, agenda, guests);
    }
    
  } catch (err) {
    console.error('Error scheduling meeting', err);
    alert('Failed to schedule meeting: ' + err.result.error.message);
  }
}

async function sendEmailInvites(title, startTime, endTime, meetLink, agenda, guests) {
  const emailContent = `
    <h3>Meeting Invitation: ${title}</h3>
    <p><strong>Time:</strong> ${startTime.toLocaleString()} - ${endTime.toLocaleString()}</p>
    <p><strong>Agenda:</strong> ${agenda || 'N/A'}</p>
    <p><a href="${meetLink}">Join Google Meet</a></p>
  `;

  guests.forEach(email => {
    gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: btoa(
          `To: ${email}\r\n` +
          `Subject: Meeting Invitation: ${title}\r\n` +
          `Content-Type: text/html; charset=UTF-8\r\n\r\n` +
          emailContent
        ).replace(/\+/g, '-').replace(/\//g, '_')
      }
    });
  });
}