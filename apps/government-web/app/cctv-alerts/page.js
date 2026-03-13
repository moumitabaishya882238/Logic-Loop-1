import SectionPageShell from "../../components/SectionPageShell";

export default function CctvAlertsPage() {
  return (
    <SectionPageShell
      eyebrow="SurakshaNet AI Monitoring"
      title="CCTV Alerts"
      description="This page will display AI-generated incidents detected from CCTV feeds, such as fights, accidents, or suspicious activity."
      bullets={[
        "Receive alerts from the CCTV AI service",
        "Display severity, source camera, and event type",
        "Allow rapid authority review and escalation"
      ]}
    />
  );
}