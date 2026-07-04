import { Badge, Card, Col, Row } from 'react-bootstrap'
import { useMirrorLakeApp } from '../../context/MirrorLakeAppContext'
import { formatShortDate } from '../../lib/mirrorLakeApp'

function StatisticsPage() {
  const { entries, statistics } = useMirrorLakeApp()

  return (
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
  )
}

export default StatisticsPage