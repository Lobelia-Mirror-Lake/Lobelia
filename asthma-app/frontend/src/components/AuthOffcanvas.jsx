import { Button, Card, Form, Offcanvas, ProgressBar } from 'react-bootstrap'
import { useMirrorLakeApp } from '../context/MirrorLakeAppContext'

function AuthOffcanvas() {
  const {
    ageRanges,
    authError,
    authFields,
    authMode,
    authOpen,
    authSteps,
    authStep,
    closeAuth,
    completeSignup,
    contactMethods,
    handleAuthBack,
    handleLoginSubmit,
    handleSignupAccountSubmit,
    handleSignupDetailsSubmit,
    handleSignupPreferencesSubmit,
    loginForm,
    openLogin,
    openSignUp,
    reminderTimes,
    setAuthStep,
    setLoginForm,
    setSignupAccount,
    setSignupDetails,
    setSignupPreferences,
    signupAccount,
    signupDetails,
    signupPreferences,
    signupProgress,
    triggerOptions,
  } = useMirrorLakeApp()

  return (
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
                    {['Garden walks', 'Indoor calm spaces', 'Low-pollen mornings', 'Cool evenings'].map((environment) => (
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
  )
}

export default AuthOffcanvas