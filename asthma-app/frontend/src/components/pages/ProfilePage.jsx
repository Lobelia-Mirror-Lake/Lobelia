import { Button, Card, Col, Form, Row } from 'react-bootstrap'
import { useMirrorLakeApp } from '../../context/MirrorLakeAppContext'

function ProfilePage() {
  const {
    ageRanges,
    contactMethods,
    environments,
    handleProfileCheckboxChange,
    handleProfileSubmit,
    profileForm,
    profileMessage,
    profileSource,
    reminderTimes,
    setProfileForm,
    triggerOptions,
  } = useMirrorLakeApp()

  return (
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
  )
}

export default ProfilePage