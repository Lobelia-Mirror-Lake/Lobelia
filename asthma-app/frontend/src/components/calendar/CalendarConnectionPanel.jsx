import { useCalendar } from "../../context/CalendarContext";

export default function CalendarConnectionPanel() {
  const {
    calendarStatus,
    statusLoading,
    statusError,
    actionLoading,
    actionError,
    actionMessage,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  } = useCalendar();

  return (
    <>
      <section className="calendar-connection-panel" aria-live="polite">
        <div className="calendar-connection-copy">
          <p className="calendar-connection-label">Google Calendar</p>

          <h2>
            {statusLoading
              ? "Checking connection status"
              : calendarStatus.connected
                ? "Calendar connected"
                : "Calendar not connected"}
          </h2>

          <p className="calendar-connection-description">
            {statusLoading
              ? "Loading your Google Calendar connection."
              : calendarStatus.connected
                ? `Connected${calendarStatus.email ? ` as ${calendarStatus.email}` : ""}.`
                : "Connect Google Calendar to bring events into your monthly view."}
          </p>

          {(statusError || actionError || actionMessage) && (
            <p
              className={[
                "calendar-connection-feedback",
                statusError || actionError ? "calendar-connection-feedback--error" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {statusError || actionError || actionMessage}
            </p>
          )}
        </div>

        <div className="calendar-connection-actions">
          {!calendarStatus.connected ? (
            <button
              type="button"
              className="calendar-connection-button calendar-connection-button--primary"
              onClick={connectGoogleCalendar}
              disabled={
                actionLoading ||
                statusLoading ||
                calendarStatus.connected ||
                !calendarStatus.configured
              }
            >
              {calendarStatus.configured
                ? actionLoading && !calendarStatus.connected
                  ? "Connecting..."
                  : "Connect Google Calendar"
                : "Google Calendar unavailable"}
            </button>
          ) : (
            <button
              type="button"
              className="calendar-connection-button calendar-connection-button--secondary"
              onClick={disconnectGoogleCalendar}
              disabled={actionLoading || statusLoading || !calendarStatus.connected}
            >
              {actionLoading && calendarStatus.connected
                ? "Disconnecting..."
                : "Disconnect Google Calendar"}
            </button>
          )}
        </div>
      </section>
    </>
  );
}