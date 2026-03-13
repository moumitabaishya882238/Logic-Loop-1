import SectionPageShell from "../../components/SectionPageShell";

export default function SosAlertsPage() {
  return (
    <SectionPageShell
      eyebrow="SurakshaNet Incidents"
      title="SOS Alerts"
      description="This page will list emergency incidents reported by citizens through the SurakshaNet mobile application."
      bullets={[
        "Fetch citizen SOS incidents from the shared backend",
        "Show incident status, time, and location",
        "Support quick review and dispatch actions"
      ]}
    />
  );
}