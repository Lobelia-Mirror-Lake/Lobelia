import { useEffect, useMemo, useState } from 'react'
import './App.css'

const storageKeys = {
  session: 'mirror-lake-session',
  account: 'mirror-lake-account',
  profile: 'mirror-lake-profile',
}

const demoAccount = {
  name: 'Demo Patient',
  email: 'demo@mirrorlake.com',
  password: 'Asthma123!',
}

const navigationItems = [
  { id: 'home', label: 'Dashboard' },
  { id: 'statistics', label: 'Statistics' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'profile', label: 'Profile' },
]

const triggerOptions = ['Pollen', 'Dust', 'Exercise', 'Cold air', 'Smoke']

const calendarDays = [
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ['1', '2', '3', '4', '5', '6', '7'],
  ['8', '9', '10', '11', '12', '13', '14'],
  ['15', '16', '17', '18', '19', '20', '21'],
  ['22', '23', '24', '25', '26', '27', '28'],
]

function readStorage(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(readStorage(storageKeys.session, null)))
  const [authPanelOpen, setAuthPanelOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [signupStage, setSignupStage] = useState('account')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [registrationForm, setRegistrationForm] = useState({
    ageGroup: '',
    severity: '',
    trigger: '',
    rescueUse: '',
    goal: '',
    emergencyContact: '',
  })
  const [authError, setAuthError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [sessionUser, setSessionUser] = useState(() => readStorage(storageKeys.session, null))
  const [savedAccount, setSavedAccount] = useState(() => readStorage(storageKeys.account, null))
  const [profile, setProfile] = useState(() => readStorage(storageKeys.profile, null))

  const activeUser = sessionUser || profile || savedAccount || demoAccount

  const pageCopy = useMemo(
    () => ({
      home: {
        title: 'Dashboard',
        subtitle: 'Daily asthma management at a glance.',
      },
      statistics: {
        title: 'Statistics',
        subtitle: 'Spot patterns before symptoms escalate.',
      },
      calendar: {
        title: 'Calendar',
        subtitle: 'Track visits, peaks, and medication changes.',
      },
      profile: {
        title: 'Profile',
        subtitle: 'Keep your care plan and preferences up to date.',
      },
    }),
    [],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (sessionUser) {
      window.localStorage.setItem(storageKeys.session, JSON.stringify(sessionUser))
    } else {
      window.localStorage.removeItem(storageKeys.session)
    }
  }, [sessionUser])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (savedAccount) {
      window.localStorage.setItem(storageKeys.account, JSON.stringify(savedAccount))
    } else {
      window.localStorage.removeItem(storageKeys.account)
    }
  }, [savedAccount])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (profile) {
      window.localStorage.setItem(storageKeys.profile, JSON.stringify(profile))
    } else {
      window.localStorage.removeItem(storageKeys.profile)
    }
  }, [profile])

  useEffect(() => {
    if (!isLoggedIn) {
      setCurrentPage('home')
    }
  }, [isLoggedIn])

  const openLogin = () => {
    setAuthMode('login')
    setSignupStage('account')
    setAuthError('')
    setFieldErrors({})
    setAuthPanelOpen(true)
  }

  const openSignUp = () => {
    setAuthMode('signup')
    setSignupStage('account')
    setAuthError('')
    setFieldErrors({})
    setAuthPanelOpen(true)
  }

  const closeAuthPanel = () => {
    setAuthPanelOpen(false)
    setAuthError('')
    setFieldErrors({})
  }

  const logout = () => {
    setIsLoggedIn(false)
    setSessionUser(null)
    setCurrentPage('home')
    setAuthMode('login')
    setSignupStage('account')
    setAuthPanelOpen(false)
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
      setFieldErrors(nextErrors)
      setAuthError('')
      return
    }

    const storedAccount = savedAccount || profile
    const validDemoLogin =
      loginForm.email.trim().toLowerCase() === demoAccount.email && loginForm.password === demoAccount.password
    const validSavedLogin =
      storedAccount &&
      loginForm.email.trim().toLowerCase() === storedAccount.email.toLowerCase() &&
      loginForm.password === storedAccount.password

    if (!validDemoLogin && !validSavedLogin) {
      setAuthError('Incorrect email or password. Try the demo account or sign up first.')
      setFieldErrors({})
      return
    }

    const user = validSavedLogin ? storedAccount : demoAccount
    setSessionUser({ name: user.name, email: user.email })
    setIsLoggedIn(true)
    setAuthPanelOpen(false)
    setCurrentPage('home')
    setAuthError('')
    setFieldErrors({})
  }

  const handleSignupAccountSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!signupForm.name.trim()) {
      nextErrors.name = 'Enter your full name.'
    }

    if (!signupForm.email.trim()) {
      nextErrors.email = 'Enter your email address.'
    } else if (!signupForm.email.includes('@')) {
      nextErrors.email = 'Use a valid email address.'
    }

    if (signupForm.password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.'
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setAuthError('')
      return
    }

    setFieldErrors({})
    setAuthError('')
    setSignupStage('details')
  }

  const handleRegistrationSubmit = (event) => {
    event.preventDefault()

    const nextErrors = {}

    if (!registrationForm.ageGroup) {
      nextErrors.ageGroup = 'Choose an age group.'
    }

    if (!registrationForm.severity) {
      nextErrors.severity = 'Choose a severity level.'
    }

    if (!registrationForm.trigger) {
      nextErrors.trigger = 'Pick your most common trigger.'
    }

    if (!registrationForm.rescueUse) {
      nextErrors.rescueUse = 'Tell us how often you use your rescue inhaler.'
    }

    if (!registrationForm.goal.trim()) {
      nextErrors.goal = 'Add a care goal so your dashboard can focus the plan.'
    }

    if (!registrationForm.emergencyContact.trim()) {
      nextErrors.emergencyContact = 'Add an emergency contact.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    const account = {
      name: signupForm.name.trim(),
      email: signupForm.email.trim().toLowerCase(),
      password: signupForm.password,
    }

    const nextProfile = {
      ...account,
      ...registrationForm,
      trackedSince: 'Today',
      preferredReminder: '8:00 AM',
    }

    setSavedAccount(account)
    setProfile(nextProfile)
    setSessionUser({ name: account.name, email: account.email })
    setIsLoggedIn(true)
    setCurrentPage('home')
    setAuthPanelOpen(false)
    setSignupStage('account')
    setFieldErrors({})
    setAuthError('')
  }

  const handleLoginFieldChange = (event) => {
    const { name, value } = event.target
    setLoginForm((current) => ({ ...current, [name]: value }))
  }

  const handleSignupFieldChange = (event) => {
    const { name, value } = event.target
    setSignupForm((current) => ({ ...current, [name]: value }))
  }

  const handleRegistrationFieldChange = (event) => {
    const { name, value } = event.target
    setRegistrationForm((current) => ({ ...current, [name]: value }))
  }

  const authPanelTitle = authMode === 'login' ? 'Welcome back' : 'Create your account'
  const authPanelSubtitle =
    authMode === 'login'
      ? 'Log in to continue to your symptom dashboard.'
      : 'Start with a quick account setup, then finish your registration questions.'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Asthma symptom tracking</p>
          <h1>Mirror Lake Health</h1>
        </div>

        <div className="topbar-actions">
          {isLoggedIn ? (
            <>
              <span className="user-chip">Signed in as {activeUser.name}</span>
              <button className="secondary-button" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button className="secondary-button" type="button" onClick={openLogin}>
                Login
              </button>
              <button className="primary-button" type="button" onClick={openSignUp}>
                Sign Up
              </button>
            </>
          )}
        </div>
      </header>

      {!isLoggedIn ? (
        <main className="landing-view">
          <section className="hero-card">
            <div className="hero-copy">
              <p className="eyebrow">Track symptoms. Predict flare-ups. Stay prepared.</p>
              <h2>Bring breathing patterns, triggers, and treatment notes into one calm dashboard.</h2>
              <p className="hero-text">
                Log symptoms, review trends, and keep your care plan close without losing sight of the next appointment.
              </p>

              <div className="hero-actions">
                <button className="primary-button" type="button" onClick={openLogin}>
                  Login
                </button>
                <button className="ghost-button" type="button" onClick={openSignUp}>
                  Sign Up
                </button>
              </div>

              <div className="demo-banner">
                <span>Demo login</span>
                <strong>demo@mirrorlake.com / Asthma123!</strong>
              </div>
            </div>

            <div className="hero-panels">
              <article className="hero-stat">
                <span>Today</span>
                <strong>4 symptom-free hours</strong>
                <small>Next inhaler reminder in 45 minutes</small>
              </article>

              <article className="hero-stat accent">
                <span>Trigger watch</span>
                <strong>Pollen + exercise</strong>
                <small>Lower intensity workouts recommended</small>
              </article>

              <article className="hero-stat">
                <span>Care plan</span>
                <strong>Green zone</strong>
                <small>Medication adherence: 96%</small>
              </article>
            </div>
          </section>

          <section className="feature-grid">
            <article className="feature-card">
              <h3>Daily symptom log</h3>
              <p>Capture shortness of breath, wheezing, rescue use, and activity impact in a few taps.</p>
            </article>
            <article className="feature-card">
              <h3>Trend insights</h3>
              <p>See where symptoms cluster by time of day, trigger, or weather condition.</p>
            </article>
            <article className="feature-card">
              <h3>Care reminders</h3>
              <p>Keep follow-up visits, peak flow checks, and medication schedules visible.</p>
            </article>
          </section>
        </main>
      ) : (
        <main className="dashboard-view">
          <section className="dashboard-header">
            <div>
              <p className="eyebrow">Welcome back</p>
              <h2>{pageCopy[currentPage].title}</h2>
              <p>{pageCopy[currentPage].subtitle}</p>
            </div>

            <div className="dashboard-header-actions">
              <span className="status-pill">Care plan synced</span>
              <button className="secondary-button" type="button" onClick={logout}>
                Logout
              </button>
            </div>
          </section>

          <nav className="dashboard-nav" aria-label="Primary">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={currentPage === item.id ? 'nav-tab active' : 'nav-tab'}
                onClick={() => setCurrentPage(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {currentPage === 'home' && (
            <section className="dashboard-grid">
              <article className="dashboard-card large">
                <div className="card-heading">
                  <h3>Today's summary</h3>
                  <span>Updated 10 minutes ago</span>
                </div>
                <div className="meter-grid">
                  <div>
                    <strong>2</strong>
                    <span>Symptoms logged</span>
                  </div>
                  <div>
                    <strong>1</strong>
                    <span>Rescue inhaler use</span>
                  </div>
                  <div>
                    <strong>96%</strong>
                    <span>Medication adherence</span>
                  </div>
                </div>
                <div className="progress-stack">
                  <div>
                    <span>Breathing stability</span>
                    <div className="progress-bar"><i style={{ width: '84%' }} /></div>
                  </div>
                  <div>
                    <span>Trigger exposure</span>
                    <div className="progress-bar warning"><i style={{ width: '42%' }} /></div>
                  </div>
                  <div>
                    <span>Recovery readiness</span>
                    <div className="progress-bar"><i style={{ width: '91%' }} /></div>
                  </div>
                </div>
              </article>

              <article className="dashboard-card">
                <h3>Quick actions</h3>
                <ul className="action-list">
                  <li>Log symptom now</li>
                  <li>Review trigger notes</li>
                  <li>Send update to care team</li>
                </ul>
              </article>

              <article className="dashboard-card">
                <h3>Reminder</h3>
                <p>Take the evening controller medication at 8:00 PM.</p>
                <strong className="highlight-note">Next check-in: tomorrow morning</strong>
              </article>
            </section>
          )}

          {currentPage === 'statistics' && (
            <section className="dashboard-grid stats-grid">
              <article className="dashboard-card large">
                <div className="card-heading">
                  <h3>Weekly trend</h3>
                  <span>Symptoms per day</span>
                </div>
                <div className="chart-bars">
                  {[
                    ['Mon', '32%'],
                    ['Tue', '44%'],
                    ['Wed', '22%'],
                    ['Thu', '58%'],
                    ['Fri', '36%'],
                    ['Sat', '18%'],
                    ['Sun', '28%'],
                  ].map(([label, width]) => (
                    <div className="chart-bar" key={label}>
                      <i style={{ height: width }} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-card">
                <h3>Top triggers</h3>
                <div className="tag-cloud">
                  <span>Pollen</span>
                  <span>Dust</span>
                  <span>Cold air</span>
                  <span>Exercise</span>
                </div>
              </article>

              <article className="dashboard-card">
                <h3>Medication adherence</h3>
                <p>8 of 8 doses taken this week.</p>
                <strong className="highlight-note">No missed doses in 7 days</strong>
              </article>
            </section>
          )}

          {currentPage === 'calendar' && (
            <section className="dashboard-grid calendar-layout">
              <article className="dashboard-card large calendar-card">
                <div className="card-heading">
                  <h3>July calendar</h3>
                  <span>Appointments and flare notes</span>
                </div>
                <div className="calendar-grid">
                  {calendarDays.flat().map((day, index) => (
                    <div key={`${day}-${index}`} className={index < 7 ? 'calendar-cell header' : 'calendar-cell'}>
                      {day}
                    </div>
                  ))}
                </div>
              </article>

              <article className="dashboard-card">
                <h3>Upcoming events</h3>
                <ul className="event-list">
                  <li>7/04 - Peak flow check</li>
                  <li>7/08 - Allergy consultation</li>
                  <li>7/15 - Controller refill</li>
                </ul>
              </article>
            </section>
          )}

          {currentPage === 'profile' && (
            <section className="dashboard-grid profile-layout">
              <article className="dashboard-card large profile-card">
                <div className="card-heading">
                  <h3>Profile details</h3>
                  <span>{activeUser.email}</span>
                </div>
                <div className="profile-fields">
                  <div>
                    <span>Name</span>
                    <strong>{activeUser.name}</strong>
                  </div>
                  <div>
                    <span>Age group</span>
                    <strong>{profile?.ageGroup || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span>Severity</span>
                    <strong>{profile?.severity || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span>Main trigger</span>
                    <strong>{profile?.trigger || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span>Emergency contact</span>
                    <strong>{profile?.emergencyContact || 'Not provided'}</strong>
                  </div>
                </div>
              </article>

              <article className="dashboard-card">
                <h3>Care goal</h3>
                <p>{profile?.goal || 'Set a goal during registration.'}</p>
              </article>
            </section>
          )}
        </main>
      )}

      {!isLoggedIn && (
        <aside className={authPanelOpen ? 'auth-overlay open' : 'auth-overlay'} aria-hidden={!authPanelOpen}>
          <button className="overlay-backdrop" type="button" onClick={closeAuthPanel} aria-label="Close authentication panel" />

          <section className="auth-panel" aria-label="Authentication form">
            <div className="auth-panel-header">
              <div>
                <p className="eyebrow">{authMode === 'login' ? 'Login' : 'Sign up'}</p>
                <h2>{authPanelTitle}</h2>
                <p>{authPanelSubtitle}</p>
              </div>

              <button className="icon-button" type="button" onClick={closeAuthPanel} aria-label="Close panel">
                ×
              </button>
            </div>

            {authMode === 'login' ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={loginForm.email}
                    onChange={handleLoginFieldChange}
                    placeholder="name@example.com"
                  />
                  {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    value={loginForm.password}
                    onChange={handleLoginFieldChange}
                    placeholder="Enter your password"
                  />
                  {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
                </label>

                {authError && <p className="form-error">{authError}</p>}

                <button className="primary-button full-width" type="submit">
                  Login
                </button>

                <button className="link-button" type="button" onClick={openSignUp}>
                  Need an account? Switch to Sign Up.
                </button>
              </form>
            ) : signupStage === 'account' ? (
              <form className="auth-form" onSubmit={handleSignupAccountSubmit}>
                <label>
                  Full name
                  <input
                    type="text"
                    name="name"
                    value={signupForm.name}
                    onChange={handleSignupFieldChange}
                    placeholder="Your full name"
                  />
                  {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    name="email"
                    value={signupForm.email}
                    onChange={handleSignupFieldChange}
                    placeholder="name@example.com"
                  />
                  {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    name="password"
                    value={signupForm.password}
                    onChange={handleSignupFieldChange}
                    placeholder="Create a strong password"
                  />
                  {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
                </label>

                <label>
                  Confirm password
                  <input
                    type="password"
                    name="confirmPassword"
                    value={signupForm.confirmPassword}
                    onChange={handleSignupFieldChange}
                    placeholder="Repeat the password"
                  />
                  {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
                </label>

                <button className="primary-button full-width" type="submit">
                  Continue
                </button>

                <button className="link-button" type="button" onClick={openLogin}>
                  Already registered? Switch to Login.
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegistrationSubmit}>
                <label>
                  Age group
                  <select name="ageGroup" value={registrationForm.ageGroup} onChange={handleRegistrationFieldChange}>
                    <option value="">Select one</option>
                    <option value="Under 18">Under 18</option>
                    <option value="18-29">18-29</option>
                    <option value="30-49">30-49</option>
                    <option value="50+">50+</option>
                  </select>
                  {fieldErrors.ageGroup && <span className="field-error">{fieldErrors.ageGroup}</span>}
                </label>

                <label>
                  Asthma severity
                  <select name="severity" value={registrationForm.severity} onChange={handleRegistrationFieldChange}>
                    <option value="">Select one</option>
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe</option>
                  </select>
                  {fieldErrors.severity && <span className="field-error">{fieldErrors.severity}</span>}
                </label>

                <label>
                  Main trigger
                  <select name="trigger" value={registrationForm.trigger} onChange={handleRegistrationFieldChange}>
                    <option value="">Select one</option>
                    {triggerOptions.map((trigger) => (
                      <option key={trigger} value={trigger}>
                        {trigger}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.trigger && <span className="field-error">{fieldErrors.trigger}</span>}
                </label>

                <label>
                  Rescue inhaler use
                  <select name="rescueUse" value={registrationForm.rescueUse} onChange={handleRegistrationFieldChange}>
                    <option value="">Select one</option>
                    <option value="Rarely">Rarely</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Daily">Daily</option>
                  </select>
                  {fieldErrors.rescueUse && <span className="field-error">{fieldErrors.rescueUse}</span>}
                </label>

                <label>
                  Care goal
                  <textarea
                    name="goal"
                    value={registrationForm.goal}
                    onChange={handleRegistrationFieldChange}
                    placeholder="Example: keep symptoms under control during exercise"
                  />
                  {fieldErrors.goal && <span className="field-error">{fieldErrors.goal}</span>}
                </label>

                <label>
                  Emergency contact
                  <input
                    type="text"
                    name="emergencyContact"
                    value={registrationForm.emergencyContact}
                    onChange={handleRegistrationFieldChange}
                    placeholder="Name and phone number"
                  />
                  {fieldErrors.emergencyContact && <span className="field-error">{fieldErrors.emergencyContact}</span>}
                </label>

                <button className="primary-button full-width" type="submit">
                  Complete registration
                </button>

                <button
                  className="link-button"
                  type="button"
                  onClick={() => {
                    setSignupStage('account')
                  }}
                >
                  Back to account details
                </button>
              </form>
            )}
          </section>
        </aside>
      )}
    </div>
  )
}

export default App
