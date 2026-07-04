import { Badge, Button, Card, Col, Form, Row } from 'react-bootstrap'
import { useMirrorLakeApp } from '../../context/MirrorLakeAppContext'
import { blankEntryForm, formatDateLabel, formatShortDate, getSeverityVariant, monthLabel } from '../../lib/mirrorLakeApp'

function CalendarPage() {
  const {
    calendarGrid,
    calendarMonth,
    calendarYear,
    deleteEntry,
    editEntry,
    editingEntryId,
    entryByDate,
    entryError,
    entryForm,
    entries,
    handleCalendarDateChange,
    handleCalendarDaySelect,
    handleEntrySubmit,
    handleMonthChange,
    monthEntries,
    selectedDate,
    severityLabels,
    severityScale,
    setCalendarMonth,
    setCalendarYear,
    setEntryForm,
    weekdayLabels,
  } = useMirrorLakeApp()

  return (
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
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((label, index) => (
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

                  const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
  )
}

export default CalendarPage