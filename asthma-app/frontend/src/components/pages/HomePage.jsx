import { Badge, Card, Col, ProgressBar, Row } from 'react-bootstrap'
import { useMirrorLakeApp } from '../../context/MirrorLakeAppContext'
import { formatShortDate } from '../../lib/mirrorLakeApp'

function HomePage() {
  const { activeUser, entries, severityLabels, statistics } = useMirrorLakeApp()

  return (
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
  )
}

export default HomePage