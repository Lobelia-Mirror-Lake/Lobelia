import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getForecast } from "../../helper-functions/getForecast";

const FALLBACK_LOCATION = {
  lat: 43.0731,
  lon: -89.4012,
};

function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(FALLBACK_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => resolve(FALLBACK_LOCATION),
      {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 300000,
      }
    );
  });
}

function formatName(user) {
  return (
    user?.first_name ||
    user?.name ||
    user?.given_name ||
    user?.email?.split("@")[0] ||
    "Name"
  );
}

function HomePage() {
  const { token, user } = useAuth();

  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadForecast() {
      try {
        setStatus("loading");
        setErrorMessage("");

        const location = await getUserLocation();

        const data = await getForecast({
          lat: location.lat,
          lon: location.lon,
          token,
        });

        if (!cancelled) {
          setForecast(data);
          setStatus("success");
        }
      } catch (error) {
        if (cancelled) return;

        if (error.code === "CHECK_IN_REQUIRED") {
          setStatus("check-in-required");
          setErrorMessage(
            "Complete today’s check-in before generating your risk forecast."
          );
        } else {
          setStatus("error");
          setErrorMessage(
            error.message || "Unable to load your forecast."
          );
        }
      }
    }

    if (token) {
      loadForecast();
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  const riskPercentage = useMemo(() => {
    const probability = Number(forecast?.flare_probability);

    if (Number.isNaN(probability)) {
      return 0;
    }

    return Math.round(probability * 100);
  }, [forecast]);

  const riskLevel = forecast?.risk_level || "Low";

  const riskClass = riskLevel.toLowerCase();

  const predictedTriggers =
    forecast?.contributing_factors?.length > 0
      ? forecast.contributing_factors
      : ["No major triggers identified"];

  const preventativeMeasures =
    forecast?.advice?.sections?.length > 0
      ? forecast.advice.sections.map((section) => section.body)
      : ["Follow your asthma action plan"];

  const nextStep =
    forecast?.advice?.summary ||
    "Complete today’s check-in to receive a personalized recommendation.";

  return (
    <main className="home-page">
      <section className="home-header">
        <h1>Hi, {formatName(user)}!</h1>

        <div
          className="home-profile-placeholder"
          aria-hidden="true"
        />
      </section>

      <div className="home-divider" />

      {status === "loading" && (
        <section className="home-state-card">
          <h2>Loading your forecast...</h2>
          <p>
            We are combining your check-in and environmental data.
          </p>
        </section>
      )}

      {status === "check-in-required" && (
        <section className="home-state-card">
          <h2>Check-in required</h2>
          <p>{errorMessage}</p>
        </section>
      )}

      {status === "error" && (
        <section className="home-state-card home-state-error">
          <h2>Forecast unavailable</h2>
          <p>{errorMessage}</p>
        </section>
      )}

      {status === "success" && forecast && (
        <>
          <section className="home-risk-section">
            <div className={`risk-summary risk-${riskClass}`}>
              <h2>{riskLevel.toUpperCase()} RISK</h2>

              <div className="risk-circle">
                <span>{riskPercentage}%</span>
              </div>
            </div>

            <div className="home-next-step-column">
              <article className="home-card next-step-card">
                <h2>Next Step</h2>
                <div className="card-divider" />
                <p>{nextStep}</p>
              </article>

              <button
                className="rescue-inhaler-button"
                type="button"
              >
                I used my rescue inhaler.
              </button>
            </div>
          </section>

          <div className="home-divider" />

          <ForecastCard
            title="Predicted Triggers"
            items={predictedTriggers}
          />

          <ForecastCard
            title="Suggested Preventative Measures"
            items={preventativeMeasures}
          />

          {forecast.advice?.disclaimer && (
            <p className="home-disclaimer">
              {forecast.advice.disclaimer}
            </p>
          )}
        </>
      )}
    </main>
  );
}

function ForecastCard({ title, items }) {
  return (
    <article className="home-card forecast-card">
      <h2>{title}</h2>
      <div className="card-divider" />

      <div className="forecast-tags">
        {items.map((item, index) => (
          <span className="forecast-tag" key={`${item}-${index}`}>
            {item}
          </span>
        ))}
      </div>

      <button className="more-details-button" type="button">
        More Details
      </button>
    </article>
  );
}

export default HomePage;