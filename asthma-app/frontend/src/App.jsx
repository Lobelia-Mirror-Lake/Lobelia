import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Col,
  Container,
  Form,
  Nav,
  Navbar,
  NavDropdown,
  Offcanvas,
  ProgressBar,
  Row,
} from 'react-bootstrap'
import './App.css'

const storageKeys = {
  session: 'mirror-lake-session',
  account: 'mirror-lake-account',
  profile: 'mirror-lake-profile',
  entries: 'mirror-lake-entries',
}

const demoAccount = {
  name: 'Demo Patient',
  email: 'demo@mirrorlake.com',
  password: 'Asthma123!',
}

const pages = [
  { key: 'home', label: 'Home' },
  { key: 'statistics', label: 'Statistics' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'profile', label: 'Profile' },
]

const authSteps = ['welcome', 'account', 'details', 'preferences', 'success']
const severityScale = [
  { value: '1', label: 'Calm' },
  { value: '2', label: 'Mild' },
  { value: '3', label: 'Noticeable' },
  { value: '4', label: 'High' },
  { value: '5', label: 'Severe' },
]
const triggerOptions = ['Pollen', 'Dust', 'Exercise', 'Cold air', 'Smoke']
const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const reminderTimes = ['06:30', '08:00', '12:30', '18:00', '21:00']
const contactMethods = ['Email', 'Text message', 'Phone call']
const environments = ['Garden walks', 'Indoor calm spaces', 'Low-pollen mornings', 'Cool evenings']
const ageRanges = ['Under 18', '18-29', '30-49', '50-64', '65+']
const severityLabels = {
  '1': 'Calm',
  '2': 'Mild',
  '3': 'Noticeable',
  '4': 'High',
  '5': 'Severe',
}

const defaultProfile = {
  name: demoAccount.name,
  email: demoAccount.email,
  ageRange: '30-49',
  emergencyContact: '',
  preferredReminder: '08:00',
  contactMethod: 'Email',
  preferredEnvironment: 'Low-pollen mornings',
  careGoal: 'Keep symptoms stable during exercise',
  accessibilityNeeds: 'Large text and clear contrast',
  triggerPreferences: triggerOptions,
}

const blankAuthAccount = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const blankAuthDetails = {
  ageRange: '30-49',
  dateOfBirth: '',
  emergencyContact: '',
  careGoal: '',
}

const blankAuthPreferences = {
  preferredReminder: '08:00',
  contactMethod: 'Email',
  preferredEnvironment: 'Low-pollen mornings',
  accessibilityNeeds: '',
  triggerPreferences: triggerOptions.reduce((accumulator, option) => {
    accumulator[option] = option === 'Pollen' || option === 'Exercise'
    return accumulator
  }, {}),
}

const blankEntryForm = (dateKey) => ({
  date: dateKey,
  severity: '3',
  symptoms: '',
  notes: '',
  triggers: '',
})

function readStorage(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  if (typeof window === 'undefined') {
    return
  }

  if (value === null || value === undefined) {
    window.localStorage.removeItem(key)
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function fromDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`)
}

function formatDateLabel(dateKey) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(fromDateKey(dateKey))
}

function formatShortDate(dateKey) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(fromDateKey(dateKey))
}

function monthLabel(year, month) {
  return `${monthLabels[month]} ${year}`
}

function generateCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []

  for (let index = 0; index < firstDay; index += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day)
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const rows = []

  for (let index = 0; index < cells.length; index += 7) {
    rows.push(cells.slice(index, index + 7))
  }

  return rows
}

function createId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getAuthProgress(step) {
  return {
    welcome: 20,
    account: 40,
    details: 65,
    preferences: 85,
    success: 100,
  }[step]
}

function getSeverityVariant(severity) {
  switch (severity) {
    case '1':
      return 'success'
    case '2':
      return 'info'
    case '3':
      return 'warning'
    case '4':
      return 'orange'
    case '5':
      return 'danger'
    default:
      return 'secondary'
  }
}

function getSeverityScore(severity) {
  return Number.parseInt(severity, 10) || 0
}

function createProfileDraft(source = defaultProfile) {
  return {
    name: source.name || '',
    email: source.email || '',
    ageRange: source.ageRange || '30-49',
    emergencyContact: source.emergencyContact || '',
    preferredReminder: source.preferredReminder || '08:00',
    contactMethod: source.contactMethod || 'Email',
    preferredEnvironment: source.preferredEnvironment || 'Low-pollen mornings',
    careGoal: source.careGoal || '',
    accessibilityNeeds: source.accessibilityNeeds || '',
    triggerPreferences: source.triggerPreferences || triggerOptions,
  }
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="presentation" focusable="false">
        <path d="M35 8c-9.8 1-18.1 6.6-22.2 15-3 6.2-2.8 14.1 1.2 21 6.9-4 12.7-4.2 18.8-1.7 8.4-5.4 12.5-14.4 12.2-24.2C44.7 11.2 41 8 35 8Z" />
        <path d="M15 32c7.8-5.8 13.7-9 24-12" />
      </svg>
    </span>
  )
}

function App() {
  const [page, setPage] = useState('home')
  const [navbarExpanded, setNavbarExpanded] = useState(false)
  const [sessionUser, setSessionUser] = useState(() => readStorage(storageKeys.session, null))
  const [savedAccount, setSavedAccount] = useState(() => readStorage(storageKeys.account, null))
  const [profile, setProfile] = useState(() => readStorage(storageKeys.profile, null))
  const [entries, setEntries] = useState(() => readStorage(storageKeys.entries, []))
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authStep, setAuthStep] = useState('welcome')
  const [authError, setAuthError] = useState('')
  const [authFields, setAuthFields] = useState({})
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupAccount, setSignupAccount] = useState(blankAuthAccount)
  const [signupDetails, setSignupDetails] = useState(blankAuthDetails)
  const [signupPreferences, setSignupPreferences] = useState(blankAuthPreferences)
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()))
  const [entryForm, setEntryForm] = useState(blankEntryForm(toDateKey(new Date())))
  const [editingEntryId, setEditingEntryId] = useState(null)
  const [entryError, setEntryError] = useState('')
  const [profileForm, setProfileForm] = useState(() => createProfileDraft(profile || savedAccount || defaultProfile))
  const [profileMessage, setProfileMessage] = useState('')

  const isLoggedIn = Boolean(sessionUser)
  const activeUser = sessionUser || profile || savedAccount || demoAccount
  const signupProgress = getAuthProgress(authStep)
  const calendarGrid = useMemo(() => generateCalendarGrid(calendarYear, calendarMonth), [calendarMonth, calendarYear])
  const entryByDate = useMemo(
    () => Object.fromEntries(entries.map((entry) => [entry.date, entry])),
    [entries],
  )
  const monthEntries = useMemo(
    () => entries.filter((entry) => {
      const date = fromDateKey(entry.date)
      return date.getFullYear() === calendarYear && date.getMonth() === calendarMonth
    }),
    [calendarMonth, calendarYear, entries],
  )
  const profileSource = profile || savedAccount || defaultProfile

  const statistics = useMemo(() => {
    const totalSeverity = entries.reduce((sum, entry) => sum + getSeverityScore(entry.severity), 0)
    const averageSeverity = entries.length ? totalSeverity / entries.length : 0
    const highestEntry = [...entries].sort((left, right) => getSeverityScore(right.severity) - getSeverityScore(left.severity))[0]
    const triggerCounts = entries.reduce((counts, entry) => {
      entry.triggers
        .split(',')
        .map((trigger) => trigger.trim())
        .filter(Boolean)
        .forEach((trigger) => {
          counts[trigger] = (counts[trigger] || 0) + 1
        })
      return counts
    }, {})

    const sortedTriggerCounts = Object.entries(triggerCounts).sort((left, right) => right[1] - left[1])
    const topTrigger = sortedTriggerCounts[0]?.[0] || 'No trigger data yet'
    const months = []
    const reference = new Date()

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(reference.getFullYear(), reference.getMonth() - offset, 1)
      const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
      const monthEntriesForPeriod = entries.filter((entry) => entry.date.startsWith(key))
      const monthAverage = monthEntriesForPeriod.length
        ? monthEntriesForPeriod.reduce((sum, entry) => sum + getSeverityScore(entry.severity), 0) / monthEntriesForPeriod.length
        : 0

      months.push({
        label: monthLabels[date.getMonth()].slice(0, 3),
        average: monthAverage,
        count: monthEntriesForPeriod.length,
      })
    }

    const calmDays = entries.filter((entry) => getSeverityScore(entry.severity) <= 2).length
    const severeDays = entries.filter((entry) => getSeverityScore(entry.severity) >= 4).length

    return {
      averageSeverity,
      highestEntry,
      topTrigger,
      months,
      calmDays,
      severeDays,
    }
  }, [entries])

  useEffect(() => writeStorage(storageKeys.session, sessionUser), [sessionUser])
  useEffect(() => writeStorage(storageKeys.account, savedAccount), [savedAccount])
  useEffect(() => writeStorage(storageKeys.profile, profile), [profile])
  useEffect(() => writeStorage(storageKeys.entries, entries), [entries])

  const openLogin = () => {
    setAuthMode('login')
    setAuthStep('welcome')
    setAuthError('')
    setAuthFields({})
    setAuthOpen(true)
  }

  const openSignUp = () => {
    setAuthMode('signup')
    setAuthStep('welcome')
    setAuthError('')
    setAuthFields({})
    setSignupAccount(blankAuthAccount)
    setSignupDetails(blankAuthDetails)
    setSignupPreferences(blankAuthPreferences)
    setAuthOpen(true)
  }

  const closeAuth = () => {
    setAuthOpen(false)
    setAuthError('')
    setAuthFields({})
  }

  const logout = () => {
    setSessionUser(null)
    setPage('home')
    setNavbarExpanded(false)
    setAuthOpen(false)
    setAuthMode('login')
    setAuthStep('welcome')
    setAuthError('')
  }

  const navigateTo = (nextPage) => {
    setPage(nextPage)
    setNavbarExpanded(false)
  }

  const handleLoginSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!loginForm.email.trim()) {
      nextErrors.email = 'Enter your email address.'
    }

    if (!loginForm.password.trim()) {
      nextErrors.password = 'Enter your password.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setAuthFields(nextErrors)
      setAuthError('')
      return
    }

    const account = savedAccount || profile || demoAccount
    const loginEmail = loginForm.email.trim().toLowerCase()
    const validDemoLogin = loginEmail === demoAccount.email && loginForm.password === demoAccount.password
    const validSavedLogin =
      account && loginEmail === account.email.toLowerCase() && loginForm.password === account.password

    if (!validDemoLogin && !validSavedLogin) {
      setAuthError('Incorrect email or password. Try the demo account or sign up first.')
      setAuthFields({})
      return
    }

    setSessionUser({ name: account.name, email: account.email })
    setProfile((current) => current || profileSource)
    setProfileForm(createProfileDraft(profileSource || account))
    setPage('home')
    setAuthOpen(false)
    setAuthError('')
    setAuthFields({})
  }

  const validateSignupAccount = () => {
    const nextErrors = {}

    if (!signupAccount.name.trim()) {
      nextErrors.name = 'Enter your full name.'
    }

    if (!signupAccount.email.trim()) {
      nextErrors.email = 'Enter your email address.'
    } else if (!signupAccount.email.includes('@')) {
      nextErrors.email = 'Use a valid email address.'
    }

    if (signupAccount.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.'
    }

    if (signupAccount.password !== signupAccount.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    return nextErrors
  }

  const handleSignupAccountSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validateSignupAccount()

    if (Object.keys(nextErrors).length > 0) {
      setAuthFields(nextErrors)
      return
    }

    setAuthFields({})
    setAuthStep('details')
  }

  const handleSignupDetailsSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!signupDetails.dateOfBirth.trim()) {
      nextErrors.dateOfBirth = 'Choose your date of birth.'
    }

    if (!signupDetails.emergencyContact.trim()) {
      nextErrors.emergencyContact = 'Add an emergency contact.'
    }

    if (!signupDetails.careGoal.trim()) {
      nextErrors.careGoal = 'Add a care goal so your plan is focused.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setAuthFields(nextErrors)
      return
    }

    setAuthFields({})
    setAuthStep('preferences')
  }

  const handleSignupPreferencesSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}
    const selectedTriggers = Object.entries(signupPreferences.triggerPreferences)
      .filter(([, value]) => Boolean(value))
      .map(([trigger]) => trigger)

    if (selectedTriggers.length === 0) {
      nextErrors.triggers = 'Select at least one trigger preference.'
    }

    if (!signupPreferences.accessibilityNeeds.trim()) {
      nextErrors.accessibilityNeeds = 'Tell us about your accessibility preferences.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setAuthFields(nextErrors)
      return
    }

    setAuthFields({})
    setAuthStep('success')
  }

  const completeSignup = () => {
    const triggerPreferences = Object.entries(signupPreferences.triggerPreferences)
      .filter(([, value]) => Boolean(value))
      .map(([trigger]) => trigger)

    const account = {
      name: signupAccount.name.trim(),
      email: signupAccount.email.trim().toLowerCase(),
      password: signupAccount.password,
    }

    const profileData = {
      ...defaultProfile,
      name: account.name,
      email: account.email,
      ageRange: signupDetails.ageRange,
      dateOfBirth: signupDetails.dateOfBirth,
      emergencyContact: signupDetails.emergencyContact.trim(),
      careGoal: signupDetails.careGoal.trim(),
      preferredReminder: signupPreferences.preferredReminder,
      contactMethod: signupPreferences.contactMethod,
      preferredEnvironment: signupPreferences.preferredEnvironment,
      accessibilityNeeds: signupPreferences.accessibilityNeeds.trim(),
      triggerPreferences,
    }

    setSavedAccount(account)
    setProfile(profileData)
    setProfileForm(createProfileDraft(profileData))
    setSessionUser({ name: profileData.name, email: profileData.email })
    setPage('home')
    setAuthOpen(false)
    setAuthStep('welcome')
    setAuthError('')
    setAuthFields({})
  }

  const handleAuthBack = () => {
    const currentIndex = authSteps.indexOf(authStep)
    setAuthStep(authSteps[Math.max(0, currentIndex - 1)])
    setAuthError('')
    setAuthFields({})
  }

  const handleCalendarDateChange = (event) => {
    const nextDate = event.target.value
    setSelectedDate(nextDate)
    setEntryForm((current) => ({ ...current, date: nextDate }))
    setEditingEntryId(null)
    setEntryError('')
  }

  const handleEntrySubmit = (event) => {
    event.preventDefault()

    if (!entryForm.date) {
      setEntryError('Choose a date for the symptom entry.')
      return
    }

    if (!entryForm.symptoms.trim()) {
      setEntryError('Describe the symptoms for this day.')
      return
    }

    const existingEntry = entries.find((entry) => entry.id === editingEntryId || entry.date === entryForm.date)
    const nextEntry = {
      id: existingEntry?.id || createId(),
      date: entryForm.date,
      severity: entryForm.severity,
      symptoms: entryForm.symptoms.trim(),
      notes: entryForm.notes.trim(),
      triggers: entryForm.triggers.trim(),
    }

    const nextEntries = entries.filter((entry) => entry.id !== nextEntry.id && entry.date !== nextEntry.date)
    nextEntries.push(nextEntry)
    nextEntries.sort((left, right) => fromDateKey(right.date) - fromDateKey(left.date))

    setEntries(nextEntries)
    setSelectedDate(nextEntry.date)
    setEntryForm(blankEntryForm(nextEntry.date))
    setEditingEntryId(null)
    setEntryError('')
  }

  const editEntry = (entry) => {
    setSelectedDate(entry.date)
    setCalendarYear(fromDateKey(entry.date).getFullYear())
    setCalendarMonth(fromDateKey(entry.date).getMonth())
    setEntryForm({
      date: entry.date,
      severity: entry.severity,
      symptoms: entry.symptoms,
      notes: entry.notes,
      triggers: entry.triggers,
    })
    setEditingEntryId(entry.id)
    setEntryError('')
    setPage('calendar')
  }

  const deleteEntry = (entryId) => {
    setEntries((current) => current.filter((entry) => entry.id !== entryId))
    if (editingEntryId === entryId) {
      setEditingEntryId(null)
      setEntryForm(blankEntryForm(selectedDate))
    }
  }

  const handleProfileSubmit = (event) => {
    event.preventDefault()

    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileMessage('Name and email are required.')
      return
    }

    const nextProfile = {
      ...profile,
      ...profileForm,
      name: profileForm.name.trim(),
      email: profileForm.email.trim().toLowerCase(),
    }

    setProfile(nextProfile)
    setSavedAccount((current) =>
      current
        ? {
            ...current,
            name: nextProfile.name,
            email: nextProfile.email,
          }
        : current,
    )
    setSessionUser((current) => (current ? { ...current, name: nextProfile.name, email: nextProfile.email } : current))
    setProfileForm(createProfileDraft(nextProfile))
    setProfileMessage('Profile saved successfully.')
  }

  const handleProfileCheckboxChange = (option) => {
    setProfileForm((current) => ({
      ...current,
      triggerPreferences: current.triggerPreferences.includes(option)
        ? current.triggerPreferences.filter((item) => item !== option)
        : [...current.triggerPreferences, option],
    }))
  }

  const handleCalendarDaySelect = (day) => {
    if (!day) {
      return
    }

    const nextDate = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(day)}`
    setSelectedDate(nextDate)
    setEntryForm((current) => ({ ...current, date: nextDate }))
    setEditingEntryId(entryByDate[nextDate]?.id || null)
    setEntryError('')
    setPage('calendar')
  }

  const handleMonthChange = (direction) => {
    const next = new Date(calendarYear, calendarMonth + direction, 1)
    setCalendarYear(next.getFullYear())
    setCalendarMonth(next.getMonth())
  }

  return (
    <div className="app-shell">
      {!isLoggedIn ? (
        <main className="landing-shell">
          <section className="landing-hero">
            <div className="landing-copy">
              <p className="eyebrow">Asthma symptom tracking with a calm, natural rhythm</p>
              <h1>Track breathing, spot patterns, and stay connected to your care plan.</h1>
              <p className="hero-text">
                Mirror Lake Health pairs daily symptom tracking with a soft, nature-inspired interface so the experience feels clear, composed, and easy to use on any device.
              </p>

              <div className="hero-actions">
                <Button className="primary-action" onClick={openLogin}>
                  Login
                </Button>
                <Button className="secondary-action" onClick={openSignUp}>
                  Sign Up
                </Button>
              </div>

              <div className="hero-badges" aria-label="Highlights">
                <Badge bg="success" className="soft-badge">
                  Daily symptom ratings
                </Badge>
                <Badge bg="warning" text="dark" className="soft-badge">
                  Editable calendar history
                </Badge>
                <Badge bg="info" text="dark" className="soft-badge">
                  Insights and progress summaries
                </Badge>
              </div>
            </div>

            <Card className="landing-panel">
              <Card.Body>
                <p className="panel-label">Today at a glance</p>
                <h2>Nature-inspired health tracking</h2>
                <div className="panel-stats">
                  <div>
                    <strong>4</strong>
                    <span>Quick symptom check-ins</span>
                  </div>
                  <div>
                    <strong>96%</strong>
                    <span>Medication consistency</span>
                  </div>
                  <div>
                    <strong>2</strong>
                    <span>Recent trigger notes</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </section>

          <section className="feature-grid">
            <Card className="feature-card">
              <Card.Body>
                <h3>Gentle guidance</h3>
                <p>Login and sign up slide in from the right, keeping the landing page uncluttered and focused.</p>
              </Card.Body>
            </Card>
            <Card className="feature-card">
              <Card.Body>
                <h3>Daily severity rating</h3>
                <p>Rate symptoms on any day, review the full calendar, and edit or delete old entries when needed.</p>
              </Card.Body>
            </Card>
            <Card className="feature-card">
              <Card.Body>
                <h3>Clear progress</h3>
                <p>Registration moves through a welcome screen, account setup, details, preferences, and success.</p>
              </Card.Body>
            </Card>
          </section>
        </main>
      ) : (
        <>
          <Navbar
            expand="lg"
            expanded={navbarExpanded}
            onToggle={(nextExpanded) => setNavbarExpanded(nextExpanded)}
            className="app-navbar"
            sticky="top"
            aria-label="Primary navigation"
          >
            <Container fluid="xl">
              <Navbar.Brand href="#home" onClick={(event) => {
                event.preventDefault()
                navigateTo('home')
              }} className="brand-link">
                <BrandMark />
                <span>
                  <strong>Mirror Lake</strong>
                  <small>Asthma tracker</small>
                </span>
              </Navbar.Brand>
              <Navbar.Toggle aria-controls="main-navigation" />
              <Navbar.Collapse id="main-navigation">
                <Nav className="me-auto align-items-lg-center gap-lg-2" activeKey={page} onSelect={(nextPage) => nextPage && navigateTo(nextPage)}>
                  <Nav.Link eventKey="home">Home</Nav.Link>
                  <Nav.Link eventKey="statistics">Statistics</Nav.Link>
                  <Nav.Link eventKey="calendar">Calendar</Nav.Link>
                  <Nav.Link eventKey="profile">Profile</Nav.Link>
                  <NavDropdown title="Pages" id="pages-dropdown">
                    {pages.map((item) => (
                      <NavDropdown.Item key={item.key} eventKey={item.key} onClick={() => navigateTo(item.key)}>
                        {item.label}
                      </NavDropdown.Item>
                    ))}
                  </NavDropdown>
                </Nav>
                <div className="nav-actions">
                  <span className="nav-user">{activeUser.name}</span>
                  <Button variant="outline-success" className="logout-button" onClick={logout}>
                    Logout
                  </Button>
                </div>
              </Navbar.Collapse>
            </Container>
          </Navbar>

          <Container fluid="xl" className="app-content py-4 py-lg-5">
            {page === 'home' && (
              <section className="page-section">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Dashboard</p>
                    <h1>Welcome back, {activeUser.name}</h1>
                    <p>Today's overview highlights your breathing stability, triggers, and follow-up tasks.</p>
                  </div>
                  <Badge bg="success" className="status-badge">
                    Care plan synced
                  </Badge>
                </div>

                <Row className="g-3">
                  <Col md={6} lg={3}>
                    <Card className="stat-card">
                      <Card.Body>
                        <span className="stat-label">Average severity</span>
                        <strong>{statistics.averageSeverity ? statistics.averageSeverity.toFixed(1) : '0.0'}</strong>
                        <small>Across all saved entries</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} lg={3}>
                    <Card className="stat-card">
                      <Card.Body>
                        <span className="stat-label">Calm days</span>
                        <strong>{statistics.calmDays}</strong>
                        <small>Severity 1-2 entries</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} lg={3}>
                    <Card className="stat-card">
                      <Card.Body>
                        <span className="stat-label">Active triggers</span>
                        <strong>{statistics.topTrigger}</strong>
                        <small>Most frequently noted</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6} lg={3}>
                    <Card className="stat-card">
                      <Card.Body>
                        <span className="stat-label">Latest note</span>
                        <strong>{entries[0] ? severityLabels[entries[0].severity] : 'No entry'}</strong>
                        <small>{entries[0] ? formatShortDate(entries[0].date) : 'Add your first daily entry'}</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="g-3 mt-1">
                  <Col lg={8}>
                    <Card className="detail-card h-100">
                      <Card.Body>
                        <div className="card-heading">
                          <h2>Today's rhythm</h2>
                          <p>Balanced breathing, lighter triggers, and consistent reminders.</p>
                        </div>
                        <div className="progress-stack">
                          <div>
                            <div className="progress-labels">
                              <span>Breathing stability</span>
                              <strong>84%</strong>
                            </div>
                            <ProgressBar now={84} variant="success" />
                          </div>
                          <div>
                            <div className="progress-labels">
                              <span>Trigger exposure</span>
                              <strong>32%</strong>
                            </div>
                            <ProgressBar now={32} variant="warning" />
                          </div>
                          <div>
                            <div className="progress-labels">
                              <span>Recovery readiness</span>
                              <strong>91%</strong>
                            </div>
                            <ProgressBar now={91} variant="info" />
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col lg={4}>
                    <Card className="detail-card h-100">
                      <Card.Body>
                        <h2>Care reminders</h2>
                        <ul className="feature-list">
                          <li>Evening controller at 8:00 PM</li>
                          <li>Peak flow check tomorrow morning</li>
                          <li>Review pollen exposure before workouts</li>
                        </ul>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </section>
            )}

            {page === 'statistics' && (
              <section className="page-section">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Statistics</p>
                    <h1>Symptoms over time</h1>
                    <p>Review averages, identify patterns, and compare monthly severity at a glance.</p>
                  </div>
                  <Badge bg="secondary" className="status-badge">
                    {entries.length} entries
                  </Badge>
                </div>

                <Row className="g-3">
                  <Col lg={8}>
                    <Card className="detail-card h-100">
                      <Card.Body>
                        <div className="card-heading">
                          <h2>Six-month severity trend</h2>
                          <p>Monthly averages based on saved daily entries.</p>
                        </div>
                        <div className="chart-grid" aria-label="Monthly symptom severity chart">
                          {statistics.months.map((month) => (
                            <div className="chart-item" key={month.label}>
                              <div className="chart-bar-shell" aria-hidden="true">
                                <div className="chart-bar" style={{ height: `${Math.max(month.average * 18, 10)}%` }} />
                              </div>
                              <span>{month.label}</span>
                              <small>{month.count} logs</small>
                            </div>
                          ))}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col lg={4}>
                    <Card className="detail-card h-100">
                      <Card.Body>
                        <h2>Insights</h2>
                        <ul className="feature-list">
                          <li>Highest average severity: {statistics.highestEntry ? `${statistics.highestEntry.severity}/5 on ${formatShortDate(statistics.highestEntry.date)}` : 'No entries yet'}</li>
                          <li>Most common trigger: {statistics.topTrigger}</li>
                          <li>Severe days logged: {statistics.severeDays}</li>
                        </ul>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </section>
            )}

            {page === 'calendar' && (
              <section className="page-section">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Calendar</p>
                    <h1>{monthLabel(calendarYear, calendarMonth)}</h1>
                    <p>Select a date, rate severity, and save or edit past symptom notes.</p>
                  </div>
                  <Badge bg="success" className="status-badge">
                    {monthEntries.length} entries this month
                  </Badge>
                  <div className="calendar-controls">
                    <Button variant="outline-success" onClick={() => handleMonthChange(-1)} aria-label="Previous month">
                      Previous
                    </Button>
                    <Button variant="outline-success" onClick={() => handleMonthChange(1)} aria-label="Next month">
                      Next
                    </Button>
                  </div>
                </div>

                <Row className="g-3">
                  <Col lg={8}>
                    <Card className="detail-card calendar-card h-100">
                      <Card.Body>
                        <div className="calendar-toolbar">
                          <Form.Select value={calendarMonth} onChange={(event) => setCalendarMonth(Number(event.target.value))} aria-label="Month">
                            {monthLabels.map((label, index) => (
                              <option key={label} value={index}>
                                {label}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Select value={calendarYear} onChange={(event) => setCalendarYear(Number(event.target.value))} aria-label="Year">
                            {Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index).map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Control type="date" value={selectedDate} onChange={handleCalendarDateChange} aria-label="Jump to date" />
                        </div>

                        <div className="calendar-grid" role="grid" aria-label="Monthly calendar">
                          {weekdayLabels.map((day) => (
                            <div className="calendar-weekday" key={day} role="columnheader">
                              {day}
                            </div>
                          ))}
                          {calendarGrid.flat().map((day, index) => {
                            if (!day) {
                              return <div className="calendar-cell blank" key={`blank-${index}`} aria-hidden="true" />
                            }

                            const dateKey = `${calendarYear}-${pad(calendarMonth + 1)}-${pad(day)}`
                            const entry = entryByDate[dateKey]
                            const isSelected = selectedDate === dateKey

                            return (
                              <button
                                key={dateKey}
                                type="button"
                                className={isSelected ? 'calendar-cell selected' : 'calendar-cell'}
                                onClick={() => handleCalendarDaySelect(day)}
                                aria-label={`${formatDateLabel(dateKey)}${entry ? `, severity ${entry.severity}` : ''}`}
                              >
                                <span className="calendar-day-number">{day}</span>
                                {entry ? (
                                  <Badge bg={getSeverityVariant(entry.severity)} text={entry.severity === '2' ? 'dark' : undefined}>
                                    {entry.severity}/5
                                  </Badge>
                                ) : (
                                  <span className="calendar-placeholder">No entry</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col lg={4}>
                    <Card className="detail-card h-100">
                      <Card.Body>
                        <div className="card-heading">
                          <h2>{editingEntryId ? 'Edit entry' : 'Daily symptom rating'}</h2>
                          <p>{formatDateLabel(entryForm.date)}</p>
                        </div>
                        <Form className="entry-form" onSubmit={handleEntrySubmit}>
                          <Form.Group>
                            <Form.Label>Date</Form.Label>
                            <Form.Control type="date" value={entryForm.date} onChange={handleCalendarDateChange} />
                          </Form.Group>

                          <Form.Group>
                            <Form.Label>Severity</Form.Label>
                            <div className="severity-picker" role="radiogroup" aria-label="Severity rating">
                              {severityScale.map((severity) => (
                                <Button
                                  key={severity.value}
                                  type="button"
                                  variant={entryForm.severity === severity.value ? 'success' : 'outline-success'}
                                  className="severity-chip"
                                  onClick={() => setEntryForm((current) => ({ ...current, severity: severity.value }))}
                                  aria-pressed={entryForm.severity === severity.value}
                                >
                                  <span>{severity.value}</span>
                                  <small>{severity.label}</small>
                                </Button>
                              ))}
                            </div>
                          </Form.Group>

                          <Form.Group>
                            <Form.Label>Symptoms</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              value={entryForm.symptoms}
                              onChange={(event) => setEntryForm((current) => ({ ...current, symptoms: event.target.value }))}
                              placeholder="Shortness of breath, wheezing, chest tightness..."
                            />
                          </Form.Group>

                          <Form.Group>
                            <Form.Label>Triggers</Form.Label>
                            <Form.Control
                              value={entryForm.triggers}
                              onChange={(event) => setEntryForm((current) => ({ ...current, triggers: event.target.value }))}
                              placeholder="Pollen, exercise, cold air..."
                            />
                          </Form.Group>

                          <Form.Group>
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={3}
                              value={entryForm.notes}
                              onChange={(event) => setEntryForm((current) => ({ ...current, notes: event.target.value }))}
                              placeholder="Medication, weather, how recovery felt..."
                            />
                          </Form.Group>

                          {entryError ? <p className="form-error">{entryError}</p> : null}

                          <div className="d-grid gap-2">
                            <Button type="submit" className="primary-action">
                              {editingEntryId ? 'Update entry' : 'Save entry'}
                            </Button>
                            {editingEntryId ? (
                              <Button
                                variant="outline-success"
                                onClick={() => {
                                  setEditingEntryId(null)
                                  setEntryForm(blankEntryForm(selectedDate))
                                }}
                              >
                                Cancel editing
                              </Button>
                            ) : null}
                          </div>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                <Row className="g-3 mt-1">
                  <Col>
                    <Card className="detail-card">
                      <Card.Body>
                        <div className="card-heading">
                          <h2>Past entries</h2>
                          <p>Review, edit, or delete previous daily logs.</p>
                        </div>
                        {entries.length ? (
                          <div className="entry-list">
                            {entries.map((entry) => (
                              <Card className="entry-item" key={entry.id}>
                                <Card.Body>
                                  <div className="entry-row">
                                    <div>
                                      <h3>{formatShortDate(entry.date)}</h3>
                                      <p>{entry.symptoms}</p>
                                      <small>Triggers: {entry.triggers || 'None noted'}</small>
                                    </div>
                                    <div className="entry-actions">
                                      <Badge bg={getSeverityVariant(entry.severity)} text={entry.severity === '2' ? 'dark' : undefined}>
                                        {entry.severity}/5 - {severityLabels[entry.severity]}
                                      </Badge>
                                      <Button variant="outline-success" size="sm" onClick={() => editEntry(entry)}>
                                        Edit
                                      </Button>
                                      <Button variant="outline-danger" size="sm" onClick={() => deleteEntry(entry.id)}>
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <p className="empty-state">No entries saved yet. Use the form above to add one.</p>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </section>
            )}

            {page === 'profile' && (
              <section className="page-section">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">Profile</p>
                    <h1>Personal information and preferences</h1>
                    <p>Update your details, reminder cadence, communication preferences, and accessibility needs.</p>
                  </div>
                </div>

                <Row className="g-3">
                  <Col lg={7}>
                    <Card className="detail-card h-100">
                      <Card.Body>
                        <Form className="profile-form" onSubmit={handleProfileSubmit}>
                          <Row className="g-3">
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Full name</Form.Label>
                                <Form.Control
                                  value={profileForm.name}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Email address</Form.Label>
                                <Form.Control
                                  type="email"
                                  value={profileForm.email}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Age range</Form.Label>
                                <Form.Select
                                  value={profileForm.ageRange}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, ageRange: event.target.value }))}
                                >
                                  {ageRanges.map((ageRange) => (
                                    <option key={ageRange} value={ageRange}>
                                      {ageRange}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Emergency contact</Form.Label>
                                <Form.Control
                                  value={profileForm.emergencyContact}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, emergencyContact: event.target.value }))}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Preferred reminder time</Form.Label>
                                <Form.Select
                                  value={profileForm.preferredReminder}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, preferredReminder: event.target.value }))}
                                >
                                  {reminderTimes.map((time) => (
                                    <option key={time} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Preferred contact method</Form.Label>
                                <Form.Select
                                  value={profileForm.contactMethod}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, contactMethod: event.target.value }))}
                                >
                                  {contactMethods.map((method) => (
                                    <option key={method} value={method}>
                                      {method}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Preferred environment</Form.Label>
                                <Form.Select
                                  value={profileForm.preferredEnvironment}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, preferredEnvironment: event.target.value }))}
                                >
                                  {environments.map((environment) => (
                                    <option key={environment} value={environment}>
                                      {environment}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Care goal</Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  value={profileForm.careGoal}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, careGoal: event.target.value }))}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Accessibility needs</Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  value={profileForm.accessibilityNeeds}
                                  onChange={(event) => setProfileForm((current) => ({ ...current, accessibilityNeeds: event.target.value }))}
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <div className="mt-3">
                            <Form.Label>Trigger preferences</Form.Label>
                            <div className="trigger-grid">
                              {triggerOptions.map((trigger) => (
                                <Form.Check
                                  inline
                                  key={trigger}
                                  type="checkbox"
                                  id={`trigger-${trigger}`}
                                  label={trigger}
                                  checked={profileForm.triggerPreferences.includes(trigger)}
                                  onChange={() => handleProfileCheckboxChange(trigger)}
                                />
                              ))}
                            </div>
                          </div>

                          {profileMessage ? <p className="profile-message">{profileMessage}</p> : null}

                          <div className="d-flex gap-2 flex-wrap mt-3">
                            <Button type="submit" className="primary-action">
                              Save profile
                            </Button>
                            <Button
                              variant="outline-success"
                              onClick={() => {
                                setProfileForm({
                                  name: profileSource.name || '',
                                  email: profileSource.email || '',
                                  ageRange: profileSource.ageRange || '30-49',
                                  emergencyContact: profileSource.emergencyContact || '',
                                  preferredReminder: profileSource.preferredReminder || '08:00',
                                  contactMethod: profileSource.contactMethod || 'Email',
                                  preferredEnvironment: profileSource.preferredEnvironment || 'Low-pollen mornings',
                                  careGoal: profileSource.careGoal || '',
                                  accessibilityNeeds: profileSource.accessibilityNeeds || '',
                                  triggerPreferences: profileSource.triggerPreferences || triggerOptions,
                                })
                                setProfileMessage('')
                              }}
                            >
                              Reset
                            </Button>
                          </div>
                        </Form>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col lg={5}>
                    <Card className="detail-card h-100">
                      <Card.Body>
                        <div className="card-heading">
                          <h2>Profile snapshot</h2>
                          <p>Saved preferences that shape reminders and reporting.</p>
                        </div>
                        <div className="profile-summary">
                          <div>
                            <span>Name</span>
                            <strong>{profileForm.name || 'Not set'}</strong>
                          </div>
                          <div>
                            <span>Email</span>
                            <strong>{profileForm.email || 'Not set'}</strong>
                          </div>
                          <div>
                            <span>Reminder</span>
                            <strong>{profileForm.preferredReminder}</strong>
                          </div>
                          <div>
                            <span>Contact method</span>
                            <strong>{profileForm.contactMethod}</strong>
                          </div>
                          <div>
                            <span>Environment</span>
                            <strong>{profileForm.preferredEnvironment}</strong>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </section>
            )}
          </Container>
        </>
      )}

      <Offcanvas show={authOpen} onHide={closeAuth} placement="end" className="auth-offcanvas" backdropClassName="auth-backdrop">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{authMode === 'login' ? 'Login' : 'Sign up'}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="auth-intro">
            <p className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Begin your registration'}</p>
            <h2>{authMode === 'login' ? 'Log in to continue to your dashboard.' : 'Create an account in a few calm steps.'}</h2>
            <ProgressBar now={authMode === 'login' ? 100 : signupProgress} className="auth-progress" aria-label="Registration progress" />
          </div>

          {authMode === 'login' ? (
            <Form className="auth-form" onSubmit={handleLoginSubmit}>
              <Form.Group>
                <Form.Label>Email address</Form.Label>
                <Form.Control
                  type="email"
                  value={loginForm.email}
                  onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="name@example.com"
                />
                {authFields.email ? <p className="form-error">{authFields.email}</p> : null}
              </Form.Group>
              <Form.Group>
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={loginForm.password}
                  onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Enter your password"
                />
                {authFields.password ? <p className="form-error">{authFields.password}</p> : null}
              </Form.Group>
              {authError ? <p className="form-error">{authError}</p> : null}
              <div className="d-grid gap-2">
                <Button type="submit" className="primary-action">Login</Button>
                <Button variant="outline-success" onClick={openSignUp}>
                  Need an account? Sign up
                </Button>
              </div>
            </Form>
          ) : (
            <div className="signup-flow">
              <div className="signup-stepper" aria-label="Registration steps">
                {authSteps.map((step, index) => {
                  const currentIndex = authSteps.indexOf(authStep)
                  const isActive = index <= currentIndex
                  return (
                    <div key={step} className={isActive ? 'step-pill active' : 'step-pill'}>
                      <span>{index + 1}</span>
                      <small>{step}</small>
                    </div>
                  )
                })}
              </div>

              {authStep === 'welcome' ? (
                <Card className="auth-page-card">
                  <Card.Body>
                    <p className="panel-label">Welcome screen</p>
                    <h3>Let's set up your tracking profile.</h3>
                    <p>We will move through account details, personal details, preferences, and a final success screen.</p>
                    <div className="d-grid gap-2 mt-3">
                      <Button className="primary-action" onClick={() => setAuthStep('account')}>
                        Start registration
                      </Button>
                      <Button variant="outline-success" onClick={openLogin}>
                        Already have an account? Login
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ) : null}

              {authStep === 'account' ? (
                <Form className="auth-form" onSubmit={handleSignupAccountSubmit}>
                  <Form.Group>
                    <Form.Label>Full name</Form.Label>
                    <Form.Control
                      value={signupAccount.name}
                      onChange={(event) => setSignupAccount((current) => ({ ...current, name: event.target.value }))}
                    />
                    {authFields.name ? <p className="form-error">{authFields.name}</p> : null}
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Email address</Form.Label>
                    <Form.Control
                      type="email"
                      value={signupAccount.email}
                      onChange={(event) => setSignupAccount((current) => ({ ...current, email: event.target.value }))}
                    />
                    {authFields.email ? <p className="form-error">{authFields.email}</p> : null}
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={signupAccount.password}
                      onChange={(event) => setSignupAccount((current) => ({ ...current, password: event.target.value }))}
                    />
                    {authFields.password ? <p className="form-error">{authFields.password}</p> : null}
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Confirm password</Form.Label>
                    <Form.Control
                      type="password"
                      value={signupAccount.confirmPassword}
                      onChange={(event) => setSignupAccount((current) => ({ ...current, confirmPassword: event.target.value }))}
                    />
                    {authFields.confirmPassword ? <p className="form-error">{authFields.confirmPassword}</p> : null}
                  </Form.Group>
                  <div className="step-actions">
                    <Button variant="outline-success" onClick={handleAuthBack}>
                      Back
                    </Button>
                    <Button type="submit" className="primary-action">
                      Continue
                    </Button>
                  </div>
                </Form>
              ) : null}

              {authStep === 'details' ? (
                <Form className="auth-form" onSubmit={handleSignupDetailsSubmit}>
                  <Form.Group>
                    <Form.Label>Date of birth</Form.Label>
                    <Form.Control
                      type="date"
                      value={signupDetails.dateOfBirth}
                      onChange={(event) => setSignupDetails((current) => ({ ...current, dateOfBirth: event.target.value }))}
                    />
                    {authFields.dateOfBirth ? <p className="form-error">{authFields.dateOfBirth}</p> : null}
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Age range</Form.Label>
                    <Form.Select
                      value={signupDetails.ageRange}
                      onChange={(event) => setSignupDetails((current) => ({ ...current, ageRange: event.target.value }))}
                    >
                      {ageRanges.map((ageRange) => (
                        <option key={ageRange} value={ageRange}>
                          {ageRange}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Emergency contact</Form.Label>
                    <Form.Control
                      value={signupDetails.emergencyContact}
                      onChange={(event) => setSignupDetails((current) => ({ ...current, emergencyContact: event.target.value }))}
                      placeholder="Name and phone number"
                    />
                    {authFields.emergencyContact ? <p className="form-error">{authFields.emergencyContact}</p> : null}
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Care goal</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={signupDetails.careGoal}
                      onChange={(event) => setSignupDetails((current) => ({ ...current, careGoal: event.target.value }))}
                      placeholder="What do you want to improve?"
                    />
                    {authFields.careGoal ? <p className="form-error">{authFields.careGoal}</p> : null}
                  </Form.Group>
                  <div className="step-actions">
                    <Button variant="outline-success" onClick={handleAuthBack}>
                      Back
                    </Button>
                    <Button type="submit" className="primary-action">
                      Continue
                    </Button>
                  </div>
                </Form>
              ) : null}

              {authStep === 'preferences' ? (
                <Form className="auth-form" onSubmit={handleSignupPreferencesSubmit}>
                  <Form.Group>
                    <Form.Label>Preferred reminder time</Form.Label>
                    <Form.Select
                      value={signupPreferences.preferredReminder}
                      onChange={(event) => setSignupPreferences((current) => ({ ...current, preferredReminder: event.target.value }))}
                    >
                      {reminderTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Contact method</Form.Label>
                    <Form.Select
                      value={signupPreferences.contactMethod}
                      onChange={(event) => setSignupPreferences((current) => ({ ...current, contactMethod: event.target.value }))}
                    >
                      {contactMethods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Preferred environment</Form.Label>
                    <Form.Select
                      value={signupPreferences.preferredEnvironment}
                      onChange={(event) => setSignupPreferences((current) => ({ ...current, preferredEnvironment: event.target.value }))}
                    >
                      {environments.map((environment) => (
                        <option key={environment} value={environment}>
                          {environment}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Accessibility needs</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={signupPreferences.accessibilityNeeds}
                      onChange={(event) => setSignupPreferences((current) => ({ ...current, accessibilityNeeds: event.target.value }))}
                      placeholder="Large text, low motion, clear contrast..."
                    />
                    {authFields.accessibilityNeeds ? <p className="form-error">{authFields.accessibilityNeeds}</p> : null}
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Trigger preferences</Form.Label>
                    <div className="trigger-grid">
                      {triggerOptions.map((trigger) => (
                        <Form.Check
                          key={trigger}
                          type="checkbox"
                          id={`trigger-${trigger}`}
                          label={trigger}
                          checked={Boolean(signupPreferences.triggerPreferences[trigger])}
                          onChange={() =>
                            setSignupPreferences((current) => ({
                              ...current,
                              triggerPreferences: {
                                ...current.triggerPreferences,
                                [trigger]: !current.triggerPreferences[trigger],
                              },
                            }))
                          }
                        />
                      ))}
                    </div>
                    {authFields.triggers ? <p className="form-error">{authFields.triggers}</p> : null}
                  </Form.Group>
                  <div className="step-actions">
                    <Button variant="outline-success" onClick={handleAuthBack}>
                      Back
                    </Button>
                    <Button type="submit" className="primary-action">
                      Review
                    </Button>
                  </div>
                </Form>
              ) : null}

              {authStep === 'success' ? (
                <Card className="auth-page-card">
                  <Card.Body>
                    <p className="panel-label">Registration success</p>
                    <h3>Your profile is ready.</h3>
                    <p>You're set to start logging daily symptoms, tracking severity, and reviewing insights.</p>
                    <div className="success-summary">
                      <div>
                        <span>Reminder</span>
                        <strong>{signupPreferences.preferredReminder}</strong>
                      </div>
                      <div>
                        <span>Contact</span>
                        <strong>{signupPreferences.contactMethod}</strong>
                      </div>
                    </div>
                    <div className="step-actions">
                      <Button variant="outline-success" onClick={handleAuthBack}>
                        Back
                      </Button>
                      <Button className="primary-action" onClick={completeSignup}>
                        Enter dashboard
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              ) : null}
            </div>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  )
}

export default App
