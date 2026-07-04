/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  authSteps,
  blankAuthAccount,
  blankAuthDetails,
  blankAuthPreferences,
  blankEntryForm,
  calculateStatistics,
  createId,
  createProfileDraft,
  defaultProfile,
  demoAccount,
  fromDateKey,
  generateCalendarGrid,
  getAuthProgress,
  pages,
  pad,
  readStorage,
  reminderTimes,
  severityLabels,
  severityScale,
  storageKeys,
  toDateKey,
  triggerOptions,
  weekdayLabels,
  writeStorage,
  ageRanges,
  contactMethods,
  environments,
} from '../lib/mirrorLakeApp'

const MirrorLakeAppContext = createContext(null)

function MirrorLakeProvider({ children }) {
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
  const statistics = useMemo(() => calculateStatistics(entries), [entries])

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
    setAuthOpen(false)
    setAuthMode('login')
    setAuthStep('welcome')
    setAuthError('')
    setAuthFields({})
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
  }

  const handleMonthChange = (direction) => {
    const next = new Date(calendarYear, calendarMonth + direction, 1)
    setCalendarYear(next.getFullYear())
    setCalendarMonth(next.getMonth())
  }

  const value = {
    activeUser,
    ageRanges,
    authError,
    authFields,
    authMode,
    authOpen,
    authSteps,
    authStep,
    calendarGrid,
    closeAuth,
    completeSignup,
    contactMethods,
    deleteEntry,
    editEntry,
    editingEntryId,
    environments,
    entryByDate,
    entryError,
    entryForm,
    entries,
    handleAuthBack,
    handleCalendarDateChange,
    handleCalendarDaySelect,
    handleEntrySubmit,
    handleLoginSubmit,
    handleMonthChange,
    handleProfileCheckboxChange,
    handleProfileSubmit,
    handleSignupAccountSubmit,
    handleSignupDetailsSubmit,
    handleSignupPreferencesSubmit,
    isLoggedIn,
    loginForm,
    logout,
    monthEntries,
    openLogin,
    openSignUp,
    pages,
    profile,
    profileForm,
    profileMessage,
    profileSource,
    reminderTimes,
    selectedDate,
    setAuthFields,
    setAuthMode,
    setAuthOpen,
    setAuthStep,
    setCalendarMonth,
    setCalendarYear,
    setEntryForm,
    setLoginForm,
    setProfileForm,
    setSignupAccount,
    setSignupDetails,
    setSignupPreferences,
    severityLabels,
    severityScale,
    signupAccount,
    signupDetails,
    signupPreferences,
    signupProgress,
    statistics,
    triggerOptions,
    weekdayLabels,
  }

  return <MirrorLakeAppContext.Provider value={value}>{children}</MirrorLakeAppContext.Provider>
}

function useMirrorLakeApp() {
  const context = useContext(MirrorLakeAppContext)

  if (!context) {
    throw new Error('useMirrorLakeApp must be used within a MirrorLakeProvider')
  }

  return context
}

export { MirrorLakeProvider, useMirrorLakeApp }