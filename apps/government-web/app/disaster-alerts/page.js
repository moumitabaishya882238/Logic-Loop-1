import SectionPageShell from "../../components/SectionPageShell";

export default function DisasterAlertsPage() {
  return (
    <SectionPageShell
      eyebrow="SurakshaNet Risk Monitoring"
      title="Disaster Alerts"
      description="This page will surface disaster warnings and environmental emergency notifications from future integrated sensor systems."
      bullets={[
        "Display flood, fire, and weather warning incidents",
        "Highlight affected zones and urgency level",
        "Prepare response coordination workflows"
      ]}
    />
  );
}